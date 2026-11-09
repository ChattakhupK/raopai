"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import { api, todayYMD } from "@/lib/client";
import type { Note, Place, SearchResult } from "@/lib/types";
import { SearchBar } from "./SearchBar";
import { Timeline } from "./Timeline";
import { PlaceDetail } from "./PlaceDetail";
import { PlaceForm, type Draft } from "./PlaceForm";
import { Lightbox } from "./Lightbox";
import { LoveCounter } from "./LoveCounter";
import { PlacePopup } from "./PlacePopup";
import { Modal, releaseModalHistory } from "./Modal";
import { BottomSheet } from "./BottomSheet";
import { NotesPanel, NoteTicker, type TalkTab } from "./Notes";
import { readMe } from "./DailyQuestion";
import { YearReview } from "./YearReview";
import { HeartIcon, ListIcon, LocateIcon, NoteIcon, PlusIcon, Spinner } from "./icons";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="size-full bg-[#f6f6f4]" />,
});

type View = { kind: "list" } | { kind: "form" } | null;

function useIsDesktop() {
  const [v, setV] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setV(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return v;
}

export default function App() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [view, setView] = useState<View>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [picking, setPicking] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [popupId, setPopupId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesOpen, setNotesOpen] = useState(false);
  const [reviewYear, setReviewYear] = useState<string | null>(null);
  const [talkTab, setTalkTab] = useState<TalkTab>("notes");
  const [dailyPending, setDailyPending] = useState(false);
  const [modalId, setModalId] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const isDesktop = useIsDesktop();
  const [mapReady, setMapReady] = useState(false);
  const greeted = useRef(false);

  useEffect(() => {
    api
      .list()
      .then(setPlaces)
      .catch((e) => setLoadError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  // Shared notes: load now, then refresh every minute and whenever the app comes back to the foreground.
  useEffect(() => {
    const load = () => api.notes().then(setNotes).catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    const onVis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Has this device answered today's question yet? (drives the red dot)
  useEffect(() => {
    const me = readMe();
    const check = me
      ? api.daily(todayYMD(), me).then((d) => !d.mine)
      : Promise.resolve(true);
    check.then(setDailyPending).catch(() => {});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const years = useMemo(
    () => Array.from(new Set(places.map((p) => p.visitedOn.slice(0, 4)))).sort().reverse(),
    [places]
  );
  const visible = useMemo(() => (year ? places.filter((p) => p.visitedOn.startsWith(year)) : places), [places, year]);
  const months = useMemo(() => new Set(visible.map((p) => p.visitedOn.slice(0, 7))).size, [visible]);

  const shown: View = view ?? (isDesktop ? { kind: "list" } : null);
  const activeId = modalId ?? popupId;
  const popupPlace = popupId ? visible.find((p) => p.id === popupId) : undefined;
  const modalPlace = modalId ? places.find((p) => p.id === modalId) : undefined;

  // A place picked before the map finished loading; focused once the map is ready.
  const pendingFocus = useRef<Place | null>(null);
  const onReady = useCallback((m: L.Map) => {
    mapRef.current = m;
    setMapReady(true);
    const p = pendingFocus.current;
    if (p) {
      pendingFocus.current = null;
      m.setView([p.lat, p.lng], 14, { animate: false });
    }
  }, []);
  // On first load, greet with a random memory (prefer ones with photos) once pins are on the map.
  useEffect(() => {
    if (greeted.current || !mapReady || loading || places.length === 0) return;
    const withPhotos = places.filter((p) => p.photos.length > 0);
    const pool = withPhotos.length ? withPhotos : places;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    // wait for the initial "fit all pins" so the popup's auto-pan happens after it
    const t = setTimeout(() => {
      greeted.current = true;
      setPopupId((cur) => cur ?? pick.id);
    }, 700);
    return () => clearTimeout(t);
  }, [mapReady, loading, places]);

  const getCenter = useCallback(() => {
    const c = mapRef.current?.getCenter();
    return c ? { lat: c.lat, lng: c.lng } : undefined;
  }, []);

  /**
   * Fly to a point, keeping it clear of the side panel (desktop) and either the bottom sheet
   * ("sheet", point placed high) or a popup that will open above it ("popup", point placed low).
   */
  const focus = useCallback(
    (lat: number, lng: number, zoom?: number, mode: "sheet" | "popup" = "sheet") => {
      const m = mapRef.current;
      if (!m) return;
      const z = Math.max(zoom ?? m.getZoom(), 14);
      const pt = m.project([lat, lng], z);
      const h = m.getSize().y;
      const dx = isDesktop ? -185 : 0;
      const dy = mode === "popup" ? -h * 0.18 : isDesktop ? 0 : h * 0.28;
      const target = m.unproject(pt.add([dx, dy]), z);
      m.flyTo(target, z, { duration: 0.8 });
    },
    [isDesktop]
  );

  /** Pin tapped on the map → small popup. */
  const openPopup = useCallback((id: string) => {
    setPicking(false);
    setPopupId(id);
  }, []);

  /** Picked from the timeline / search → fly there, then show the popup. */
  const selectPlace = useCallback(
    (id: string) => {
      const p = places.find((x) => x.id === id);
      if (!p) return;
      setDraft(null);
      setPicking(false);
      setPopupId(null);
      if (!isDesktop) setView(null);
      if (year && !p.visitedOn.startsWith(year)) setYear(null);
      const m = mapRef.current;
      if (!m) {
        // map still loading: open the popup now, center on it when the map arrives
        pendingFocus.current = p;
        setPopupId(id);
        return;
      }
      // open after the fly animation; timer is a fallback if the map was already in place
      const open = () => setPopupId(id);
      m.once("moveend", open);
      setTimeout(() => {
        m.off("moveend", open);
        open();
      }, 1100);
      focus(p.lat, p.lng, undefined, "popup");
    },
    [places, focus, isDesktop, year]
  );

  const closePopup = useCallback((id: string) => setPopupId((cur) => (cur === id ? null : cur)), []);

  const startDraftFromResult = (r: SearchResult) => {
    setPicking(false);
    setDraft({ name: r.name, address: r.address, lat: r.lat, lng: r.lng, visitedOn: todayYMD(), note: "", photos: [] });
    setView({ kind: "form" });
    focus(r.lat, r.lng, 16);
  };

  const confirmPick = async () => {
    const c = getCenter();
    if (!c) return;
    setPicking(false);
    focus(c.lat, c.lng); // keep the new pin above the form sheet
    if (draft) {
      setDraft({ ...draft, lat: c.lat, lng: c.lng });
      setView({ kind: "form" });
      return;
    }
    setResolving(true);
    const r = await api.reverse(c.lat, c.lng);
    setResolving(false);
    setDraft({
      name: r?.name ?? "",
      address: r?.address ?? null,
      lat: c.lat,
      lng: c.lng,
      visitedOn: todayYMD(),
      note: "",
      photos: [],
    });
    setView({ kind: "form" });
  };

  const locate = () => {
    if (!navigator.geolocation) return setToast("อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง");
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { duration: 0.8 }),
      () => setToast("ไม่สามารถเข้าถึงตำแหน่งได้"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const closePanel = () => {
    setView(null);
    setDraft(null);
  };

  const panel = (() => {
    if (shown?.kind === "form" && draft)
      return (
        <PlaceForm
          draft={draft}
          onChange={(fn) => setDraft((d) => (d ? fn(d) : d))}
          onCancel={() => {
            const id = draft.id;
            setDraft(null);
            setView(null);
            if (id) setModalId(id);
          }}
          onMovePin={() => {
            setPicking(true);
            setView(null);
            mapRef.current?.flyTo([draft.lat, draft.lng], Math.max(mapRef.current.getZoom(), 16), { duration: 0.6 });
          }}
          onSaved={(p) => {
            setPlaces((list) =>
              [p, ...list.filter((x) => x.id !== p.id)].sort(
                (a, b) => b.visitedOn.localeCompare(a.visitedOn) || b.createdAt.localeCompare(a.createdAt)
              )
            );
            setDraft(null);
            setView(null);
            if (year && !p.visitedOn.startsWith(year)) setYear(null);
            setPopupId(p.id);
            setToast(draft.id ? "บันทึกแล้ว" : "ปักหมุดแล้ว ♥");
          }}
        />
      );
    if (shown?.kind === "list")
      return (
        <>
          {!isDesktop && (
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">ที่ที่เราไปด้วยกัน</h2>
              <button onClick={() => setView(null)} className="text-sm font-medium text-brand">
                ดูแผนที่
              </button>
            </div>
          )}
          {loadError && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-brand-dark">{loadError}</p>}
          <Timeline
            places={visible}
            years={years}
            year={year}
            onYear={setYear}
            activeId={activeId}
            onSelect={selectPlace}
            loading={loading}
            onReview={setReviewYear}
          />
        </>
      );
    return null;
  })();

  const stats = (
    <span className="text-xs text-muted">
      {visible.length} ที่ · {months} เดือน
    </span>
  );

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0">
        <MapView
          places={visible}
          activeId={activeId}
          draft={draft && !picking ? { lat: draft.lat, lng: draft.lng } : null}
          onSelect={openPopup}
          onReady={onReady}
          popup={
            popupPlace && !picking && shown?.kind !== "form"
              ? { place: popupPlace, content: <PlacePopup place={popupPlace} onOpen={() => setModalId(popupPlace.id)} /> }
              : null
          }
          onPopupClose={closePopup}
          popupPadding={
            isDesktop
              ? { topLeft: [395, 80], bottomRight: [24, 90] }
              : { topLeft: [16, 90], bottomRight: [16, 110] }
          }
          onMapClick={(ll) => {
            if (picking) return;
            if (shown?.kind === "form" && draft) setDraft({ ...draft, lat: ll.lat, lng: ll.lng });
            else if (!isDesktop && view) setView(null);
          }}
        />
      </div>

      {/* Top: brand + search */}
      <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-[1100] px-4 md:left-4 md:right-auto md:w-[350px] md:px-0 md:pt-4">
        <div className="pointer-events-auto flex flex-col gap-2 md:rounded-2xl md:bg-white md:p-2 md:shadow-[0_4px_20px_rgba(0,0,0,0.06)] md:ring-1 md:ring-black/5">
          <div className="hidden items-center justify-between px-1.5 pt-0.5 md:flex">
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-lg bg-brand text-white">
                <HeartIcon width={12} height={12} />
              </span>
              <span className="text-[15px] font-semibold tracking-tight">RaoPai</span>
            </div>
            {stats}
          </div>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <SearchBar places={places} getCenter={getCenter} onPickResult={startDraftFromResult} onPickPlace={selectPlace} />
            </div>
            {/* mobile: counter sits beside the search bar */}
            <LoveCounter className="shrink-0 md:hidden" />
          </div>
        </div>
      </div>

      {/* desktop: anniversary counter in the top-right corner */}
      <div className="absolute right-4 top-4 z-[1100] hidden md:block">
        <LoveCounter />
      </div>

      {/* Picking mode: center crosshair pin */}
      {picking && (
        <>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[900] -translate-x-1/2 -translate-y-full">
            <svg width="40" height="50" viewBox="0 0 34 42" className="drop-shadow-lg">
              <path d="M17 1C8.2 1 1 7.9 1 16.6 1 28 17 41 17 41s16-13 16-24.4C33 7.9 25.8 1 17 1z" fill="#E11D2E" stroke="#fff" strokeWidth="2" />
              <circle cx="17" cy="16" r="5" fill="#fff" />
            </svg>
          </div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-[899] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/30" />
          <div className="safe-bottom animate-sheet absolute inset-x-0 bottom-0 z-[1000] px-4 md:left-auto md:right-4 md:w-[380px] md:pb-4">
            <div className="rounded-2xl bg-white p-3 shadow-[0_-4px_24px_rgba(0,0,0,0.1)] ring-1 ring-black/5">
              <p className="px-1 text-xs text-muted">เลื่อนแผนที่ให้หมุดแดงอยู่ตรงตำแหน่งที่ต้องการ</p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setPicking(false);
                    if (draft) setView({ kind: "form" });
                  }}
                  className="h-10 rounded-lg bg-zinc-100 text-sm font-medium hover:bg-zinc-200"
                >
                  ยกเลิก
                </button>
                <button onClick={confirmPick} className="h-10 rounded-lg bg-brand text-sm font-medium text-white hover:bg-brand-dark">
                  ใช้ตำแหน่งนี้
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating actions */}
      {!picking && (shown === null || isDesktop) && (
        <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex items-end justify-between gap-2 px-4 pb-1 md:justify-end md:pb-7 md:pr-6">
          <button
            onClick={() => {
              setView({ kind: "list" });
              setNotesOpen(false);
            }}
            className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-full bg-white px-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/5 md:hidden"
          >
            <ListIcon width={16} height={16} className="shrink-0" />
            <span className="whitespace-nowrap text-sm font-medium">ไทม์ไลน์</span>
            <span className="hidden whitespace-nowrap min-[400px]:inline">{stats}</span>
          </button>
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => {
                setNotesOpen(true);
                if (dailyPending) setTalkTab("daily");
                if (!isDesktop) setView(null); // one sheet at a time on phones
              }}
              aria-label="ข้อความถึงกัน"
              className="relative grid size-10 place-items-center rounded-full bg-white text-zinc-600 shadow-[0_2px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/5 transition hover:text-brand"
            >
              <NoteIcon width={18} height={18} />
              {dailyPending && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand ring-2 ring-white" />}
            </button>
            <button
              onClick={locate}
              aria-label="ตำแหน่งของฉัน"
              className="grid size-10 place-items-center rounded-full bg-white text-zinc-600 shadow-[0_2px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/5 transition hover:text-brand"
            >
              <LocateIcon width={18} height={18} />
            </button>
            <button
              onClick={() => {
                setDraft(null);
                setView(isDesktop ? { kind: "list" } : null);
                setPicking(true);
              }}
              aria-label="ปักหมุดใหม่"
              className="flex h-10 items-center gap-1 rounded-full bg-brand pl-3 pr-4 text-white shadow-[0_4px_14px_rgba(225,29,46,0.3)] transition hover:bg-brand-dark active:scale-95"
            >
              {resolving ? <Spinner className="size-4" /> : <PlusIcon width={16} height={16} strokeWidth={2.2} />}
              <span className="whitespace-nowrap text-sm font-medium">ปักหมุด</span>
            </button>
          </div>
        </div>
      )}

      {/* Panel: floating card on desktop, draggable bottom sheet on mobile */}
      {panel && !picking && isDesktop && (
        <div className="animate-sheet absolute bottom-4 left-4 top-[118px] z-[1050] flex w-[350px] flex-col rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3">{panel}</div>
        </div>
      )}
      {panel && !picking && !isDesktop && (
        <BottomSheet
          key={shown?.kind}
          initial="half"
          // dragging the timeline away closes it; the form only closes via its X so nothing is lost
          onDismiss={shown?.kind === "list" ? closePanel : undefined}
        >
          {panel}
        </BottomSheet>
      )}

      {toast && (
        <div className="animate-fade pointer-events-none absolute left-1/2 top-24 z-[3500] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg md:top-6">
          {toast}
        </div>
      )}

      {!picking && !notesOpen && <NoteTicker notes={notes} onOpen={() => setNotesOpen(true)} />}

      {notesOpen && !picking && (() => {
        const notesPanel = (
          <NotesPanel
            tab={talkTab}
            onTab={setTalkTab}
            dailyPending={dailyPending}
            onDailyAnswered={() => setDailyPending(false)}
            notes={notes}
            onClose={() => setNotesOpen(false)}
            onPost={async (text) => {
              const n = await api.postNote(text);
              setNotes((l) => [n, ...l]);
            }}
            onDelete={async (id) => {
              try {
                await api.deleteNote(id);
                setNotes((l) => l.filter((x) => x.id !== id));
              } catch (e) {
                setToast((e as Error).message);
              }
            }}
          />
        );
        return isDesktop ? (
          <div className="animate-sheet absolute bottom-20 right-4 top-16 z-[1060] flex w-[320px] flex-col rounded-2xl bg-white px-4 pb-3 pt-3 shadow-[0_4px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
            {notesPanel}
          </div>
        ) : (
          <BottomSheet key="notes" initial="half" onDismiss={() => setNotesOpen(false)} fill>
            {notesPanel}
          </BottomSheet>
        );
      })()}

      {modalPlace && (
        <Modal label={modalPlace.name} onClose={() => setModalId(null)}>
          <PlaceDetail
            key={modalPlace.id}
            place={modalPlace}
            onClose={() => {
              releaseModalHistory();
              setModalId(null);
            }}
            onEdit={() => {
              releaseModalHistory();
              setModalId(null);
              setPopupId(null);
              setDraft({ ...modalPlace });
              setView({ kind: "form" });
            }}
            onDelete={async () => {
              try {
                await api.remove(modalPlace.id);
                releaseModalHistory();
                setModalId(null);
                setPopupId(null);
                setPlaces((l) => l.filter((x) => x.id !== modalPlace.id));
                setToast("ลบหมุดแล้ว");
              } catch (e) {
                setToast((e as Error).message);
              }
            }}
            onOpenPhoto={(index) => setLightbox({ photos: modalPlace.photos, index })}
          />
        </Modal>
      )}

      {reviewYear && <YearReview places={places} year={reviewYear} onClose={() => setReviewYear(null)} />}

      {lightbox && <Lightbox photos={lightbox.photos} start={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  );
}
