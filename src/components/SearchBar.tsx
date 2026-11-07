"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { Place, SearchResult } from "@/lib/types";
import { CloseIcon, HeartIcon, PinIcon, SearchIcon, Spinner } from "./icons";

type Props = {
  places: Place[];
  getCenter: () => { lat: number; lng: number } | undefined;
  onPickResult: (r: SearchResult) => void;
  onPickPlace: (id: string) => void;
};

export function SearchBar({ places, getCenter, onPickResult, onPickPlace }: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState<{ q: string; items: SearchResult[]; error?: string } | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  const query = q.trim();
  const mine = query
    ? places.filter((p) => (p.name + " " + (p.address ?? "")).toLowerCase().includes(query.toLowerCase())).slice(0, 4)
    : [];

  const results = res?.q === query ? res.items : [];
  const error = res?.q === query ? res.error : undefined;
  const loading = query.length >= 2 && res?.q !== query;

  useEffect(() => {
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api
        .search(query, getCenter(), ctrl.signal)
        .then((items) => setRes({ q: query, items }))
        .catch((e) => {
          if ((e as Error).name !== "AbortError") setRes({ q: query, items: [], error: "ค้นหาไม่สำเร็จ ลองใหม่อีกครั้ง" });
        });
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, getCenter]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const close = () => {
    setOpen(false);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const showDropdown = open && query.length > 0;

  return (
    <div ref={wrap} className="relative">
      <div className="flex h-10 items-center gap-2 rounded-xl bg-white px-3 shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5 transition focus-within:ring-brand/40 md:bg-zinc-50 md:shadow-none md:ring-black/[0.04]">
        <SearchIcon width={16} height={16} className="shrink-0 text-zinc-400" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              onPickResult(results[0]);
              setQ("");
              close();
            }
            if (e.key === "Escape") close();
          }}
          placeholder="ค้นหาสถานที่ คาเฟ่ ร้านอาหาร…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
          enterKeyHint="search"
        />
        {loading && <Spinner className="text-brand" />}
        {q && !loading && (
          <button aria-label="ล้าง" onClick={() => setQ("")} className="text-zinc-400 hover:text-ink">
            <CloseIcon width={18} height={18} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="animate-fade absolute left-0 right-0 top-12 z-[1100] max-h-[60dvh] overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
          {mine.length > 0 && (
            <>
              <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted">ที่ที่เราเคยไป</div>
              {mine.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onPickPlace(p.id);
                    setQ("");
                    close();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-brand-soft"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white">
                    <HeartIcon width={14} height={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted">{p.address}</span>
                  </span>
                </button>
              ))}
            </>
          )}
          {results.length > 0 && (
            <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted">ผลการค้นหา</div>
          )}
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onPickResult(r);
                setQ("");
                close();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-50"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-500">
                <PinIcon width={16} height={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{r.name}</span>
                <span className="block truncate text-xs text-muted">{r.address}</span>
              </span>
            </button>
          ))}
          {!loading && query.length >= 2 && results.length === 0 && mine.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted">
              {error ?? "ไม่พบสถานที่ ลองพิมพ์ชื่ออื่น หรือแตะบนแผนที่เพื่อปักหมุดเอง"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
