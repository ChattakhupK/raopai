"use client";
import { useEffect, useRef, useState } from "react";
import { thumb } from "@/lib/photos";
import { ChevronLeftIcon } from "./icons";

type Props = {
  photos: string[];
  /** Cloudinary resize width for each slide. */
  width: number;
  className?: string;
  /** ms per slide */
  interval?: number;
  /** Allow swipe + arrow buttons (detail modal). */
  controls?: boolean;
  onOpen?: (index: number) => void;
};

/** Auto-advancing crossfade slideshow. Pauses on hover/touch. */
export function Slideshow({ photos, width, className = "", interval = 3500, controls = false, onOpen }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = photos.length;
  const i = n ? index % n : 0;

  const go = (d: number) => setIndex((v) => (v + d + n) % n);

  // One timeout per slide: a manual change restarts the countdown.
  useEffect(() => {
    if (n < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setTimeout(() => setIndex((v) => (v + 1) % n), interval);
    return () => clearTimeout(t);
  }, [i, n, paused, interval]);

  if (!n) return null;

  // Keep previous (fading out), current, and next (preloading) mounted.
  const keep = new Set([i, (i + 1) % n, (i - 1 + n) % n]);

  return (
    <div
      className={`group relative overflow-hidden bg-brand-soft ${className}`}
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setPaused(false)}
      onTouchStart={(e) => {
        setPaused(true);
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        setPaused(false);
        if (!controls || touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
    >
      {photos.map((url, k) =>
        keep.has(k) ? (
          <button
            key={url}
            type="button"
            tabIndex={k === i ? 0 : -1}
            aria-hidden={k !== i}
            onClick={() => onOpen?.(k)}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${k === i ? "z-[1] opacity-100" : "opacity-0"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb(url, width)}
              alt=""
              draggable={false}
              className="size-full select-none object-cover"
            />
          </button>
        ) : null
      )}

      {n > 1 && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-10 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-2 z-[3] flex justify-center gap-1">
            {photos.map((url, k) => (
              <button
                key={url}
                type="button"
                aria-label={`รูปที่ ${k + 1}`}
                onClick={() => setIndex(k)}
                className={`h-1.5 rounded-full transition-all duration-300 ${k === i ? "w-4 bg-white" : "w-1.5 bg-white/55"}`}
              />
            ))}
          </div>
        </>
      )}

      {controls && n > 1 && (
        <>
          <button
            type="button"
            aria-label="ก่อนหน้า"
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 z-[3] hidden size-8 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink opacity-0 shadow transition group-hover:opacity-100 md:grid"
          >
            <ChevronLeftIcon width={16} height={16} />
          </button>
          <button
            type="button"
            aria-label="ถัดไป"
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 z-[3] hidden size-8 -translate-y-1/2 rotate-180 place-items-center rounded-full bg-white/85 text-ink opacity-0 shadow transition group-hover:opacity-100 md:grid"
          >
            <ChevronLeftIcon width={16} height={16} />
          </button>
        </>
      )}
    </div>
  );
}
