"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import { api, todayYMD } from "@/lib/client";
import type { Place, SearchResult } from "@/lib/types";
import { SearchBar } from "./SearchBar";
import { Timeline } from "./Timeline";
import { PlaceDetail } from "./PlaceDetail";
import { PlaceForm, type Draft } from "./PlaceForm";
import { Lightbox } from "./Lightbox";
import { HeartIcon, ListIcon, LocateIcon, PlusIcon, Spinner } from "./icons";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="size-full bg-[#f6f6f4]" />,
});

type View = { kind: "list" } | { kind: "detail"; id: string } | { kind: "form" } | null;

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
  const mapRef = useRef<L.Map | null>(null);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    api
      .list()
      .then(setPlaces)
      .catch((e) => setLoadError((e as Error).message))
      .finally(() => setLoading(false));
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
  const activeId = shown?.kind === "detail" ? shown.id : null;
  const active = activeId ? places.find((p) => p.id === activeId) : undefined;

  const onReady = useCallback((m: L.Map) => {
    mapRef.current = m;
  }, []);
  const getCenter = useCallback(() => {
    const c = mapRef.current?.getCenter();
    return c ? { lat: c.lat, lng: c.lng } : undefined;
  }, []);

  /** Fly to a point, keeping it clear of the bottom sheet (mobile) or side panel (desktop). */
  const focus = useCallback(
    (lat: number, lng: number, zoom?: number) => {
      const m = mapRef.current;
      if (!m) return;
      const z = Math.max(zoom ?? m.getZoom(), 14);
      const pt = m.project([lat, lng], z);
      const offset = isDesktop ? { x: -210, y: 0 } : { x: 0, y: window.innerHeight * 0.22 };
      const target = m.unproject(pt.add([-offset.x, offset.y]), z);
      m.flyTo(target, z, { duration: 0.8 });
    },
    [isDesktop]
  );

  const selectPlace = useCallback(
    (id: string) => {
      const p = places.find((x) => x.id === id);
      if (!p) return;
      setDraft(null);
      setPicking(false);
      setView({ kind: "detail", id });
      focus(p.lat, p.lng);
    },
    [places, focus]
  );

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
            setView(id ? { kind: "detail", id } : null);
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
            setView({ kind: "detail", id: p.id });
            setToast(draft.id ? "บันทึกแล้ว" : "ปักหมุดแล้ว ♥");
          }}
        />
      );
    if (shown?.kind === "detail" && active)
      return (
        <PlaceDetail
          key={active.id}
          place={active}
          onClose={() => setView(null)}
          onEdit={() => {
            setDraft({ ...active });
            setView({ kind: "form" });
          }}
          onDelete={async () => {
            try {
              await api.remove(active.id);
              setPlaces((l) => l.filter((x) => x.id !== active.id));
              setView(null);
              setToast("ลบหมุดแล้ว");
            } catch (e) {
              setToast((e as Error).message);
            }
          }}
          onOpenPhoto={(index) => setLightbox({ photos: active.photos, index })}
        />
      );
    if (shown?.kind === "list")
      return (
        <>
          {!isDesktop && (
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">ที่ที่เราไปด้วยกัน</h2>
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
          onSelect={selectPlace}
          onReady={onReady}
          onMapClick={(ll) => {
            if (picking) return;
            if (shown?.kind === "form" && draft) setDraft({ ...draft, lat: ll.lat, lng: ll.lng });
            else if (!isDesktop && view) setView(null);
          }}
        />
      </div>

      {/* Top: brand + search */}
      <div className="safe-top pointer-events-none absolute inset-x-0 top-0 z-[1100] px-4 md:left-4 md:right-auto md:w-[400px] md:px-0 md:pt-4">
        <div className="pointer-events-auto flex flex-col gap-2 md:rounded-3xl md:bg-white md:p-3 md:shadow-[0_8px_30px_rgba(0,0,0,0.08)] md:ring-1 md:ring-black/5">
          <div className="hidden items-center justify-between px-1 pb-1 md:flex">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-brand text-white">
                <HeartIcon width={16} height={16} />
              </span>
              <span className="text-lg font-semibold tracking-tight">RaoPai</span>
            </div>
            {stats}
          </div>
          <SearchBar places={places} getCenter={getCenter} onPickResult={startDraftFromResult} onPickPlace={selectPlace} />
        </div>
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
            <div className="rounded-3xl bg-white p-4 shadow-[0_-8px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
              <p className="font-semibold">เลือกตำแหน่ง</p>
              <p className="mt-0.5 text-sm text-muted">เลื่อนแผนที่ให้หมุดแดงอยู่ตรงสถานที่ที่ต้องการ</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setPicking(false);
                    if (draft) setView({ kind: "form" });
                  }}
                  className="h-11 rounded-xl bg-zinc-100 font-medium hover:bg-zinc-200"
                >
                  ยกเลิก
                </button>
                <button onClick={confirmPick} className="h-11 rounded-xl bg-brand font-medium text-white hover:bg-brand-dark">
                  ใช้ตำแหน่งนี้
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating actions */}
      {!picking && (shown === null || isDesktop) && (
        <div className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 z-[1000] flex items-end justify-between gap-3 px-4 md:justify-end md:pb-6 md:pr-6">
          <button
            onClick={() => setView({ kind: "list" })}
            className="pointer-events-auto flex h-12 items-center gap-2 rounded-full bg-white px-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)] ring-1 ring-black/5 md:hidden"
          >
            <ListIcon width={18} height={18} />
            <span className="text-sm font-medium">ไทม์ไลน์</span>
            {stats}
          </button>
          <div className="pointer-events-auto flex items-end gap-3">
            <button
              onClick={locate}
              aria-label="ตำแหน่งของฉัน"
              className="grid size-12 place-items-center rounded-full bg-white text-ink shadow-[0_4px_20px_rgba(0,0,0,0.1)] ring-1 ring-black/5"
            >
              <LocateIcon />
            </button>
            <button
              onClick={() => {
                setDraft(null);
                setView(isDesktop ? { kind: "list" } : null);
                setPicking(true);
              }}
              aria-label="ปักหมุดใหม่"
              className="flex h-14 items-center gap-2 rounded-full bg-brand pl-4 pr-5 text-white shadow-[0_10px_30px_rgba(225,29,46,0.4)] transition hover:bg-brand-dark active:scale-95"
            >
              {resolving ? <Spinner /> : <PlusIcon />}
              <span className="font-medium">ปักหมุด</span>
            </button>
          </div>
        </div>
      )}

      {/* Panel: bottom sheet on mobile, floating card on desktop */}
      {panel && !picking && (
        <div
          className={`animate-sheet absolute z-[1050] flex flex-col bg-white
            inset-x-0 bottom-0 max-h-[82dvh] rounded-t-[28px] shadow-[0_-10px_40px_rgba(0,0,0,0.12)]
            md:inset-x-auto md:bottom-4 md:left-4 md:top-[150px] md:max-h-none md:w-[400px] md:rounded-3xl md:shadow-[0_8px_30px_rgba(0,0,0,0.08)] md:ring-1 md:ring-black/5`}
        >
          <button
            aria-label="ปิด"
            onClick={closePanel}
            className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-zinc-200 md:hidden"
          />
          <div className="safe-bottom min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 md:pt-5">{panel}</div>
        </div>
      )}

      {toast && (
        <div className="animate-fade pointer-events-none absolute left-1/2 top-24 z-[2000] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lg md:top-6">
          {toast}
        </div>
      )}

      {lightbox && <Lightbox photos={lightbox.photos} start={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  );
}
