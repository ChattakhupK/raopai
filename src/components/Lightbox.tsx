"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, CloseIcon } from "./icons";
import { thumb } from "@/lib/photos";

export function Lightbox({ photos, start, onClose }: { photos: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const touchX = useRef<number | null>(null);
  const go = (d: number) => setI((v) => (v + d + photos.length) % photos.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setI((v) => (v - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") setI((v) => (v + 1) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, photos.length]);

  return (
    <div
      data-lightbox
      className="animate-fade fixed inset-0 z-[3000] flex items-center justify-center bg-black/95"
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumb(photos[i], 1800)} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
      <button aria-label="ปิด" onClick={onClose} className="safe-top absolute right-4 top-0 mt-2 grid size-10 place-items-center rounded-full bg-white/10 text-white">
        <CloseIcon />
      </button>
      {photos.length > 1 && (
        <>
          <button
            aria-label="ก่อนหน้า"
            onClick={(e) => (e.stopPropagation(), go(-1))}
            className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white sm:grid"
          >
            <ChevronLeftIcon />
          </button>
          <button
            aria-label="ถัดไป"
            onClick={(e) => (e.stopPropagation(), go(1))}
            className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 rotate-180 place-items-center rounded-full bg-white/10 text-white sm:grid"
          >
            <ChevronLeftIcon />
          </button>
          <div className="safe-bottom absolute bottom-0 left-0 right-0 flex justify-center gap-1.5 pb-4">
            {photos.map((_, k) => (
              <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
