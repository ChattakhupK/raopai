"use client";
import { fmt } from "@/lib/client";
import type { Place } from "@/lib/types";
import { CalendarIcon } from "./icons";
import { Slideshow } from "./Slideshow";

/** Compact card shown above a pin on the map. */
export function PlacePopup({ place, onOpen }: { place: Place; onOpen: () => void }) {
  return (
    <div className="w-[200px] font-sans text-ink">
      {place.photos.length > 0 && (
        <Slideshow photos={place.photos} width={420} className="aspect-[4/3] w-full" interval={3000} onOpen={onOpen} />
      )}
      <div className="p-3">
        <p className="flex items-center gap-1 text-[11px] font-medium text-brand">
          <CalendarIcon width={11} height={11} /> {fmt.date(place.visitedOn)}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug">{place.name}</p>
        <button
          onClick={onOpen}
          className="mt-2.5 flex h-8 w-full items-center justify-center rounded-lg bg-brand text-xs font-medium text-white transition hover:bg-brand-dark active:scale-[0.98]"
        >
          ดูรายละเอียด
        </button>
      </div>
    </div>
  );
}
