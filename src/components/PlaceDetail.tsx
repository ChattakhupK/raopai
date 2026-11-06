"use client";
import { useState } from "react";
import { fmt } from "@/lib/client";
import { thumb } from "@/lib/photos";
import type { Place } from "@/lib/types";
import { CalendarIcon, CloseIcon, EditIcon, NavigateIcon, PinIcon, Spinner, TrashIcon } from "./icons";

type Props = {
  place: Place;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
  onOpenPhoto: (index: number) => void;
};

export function PlaceDetail({ place, onClose, onEdit, onDelete, onOpenPhoto }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {place.photos.length > 0 && (
        <div className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5">
          {place.photos.map((url, i) => (
            <button
              key={url}
              onClick={() => onOpenPhoto(i)}
              className={`relative shrink-0 snap-center overflow-hidden rounded-2xl bg-zinc-100 ${
                place.photos.length === 1 ? "aspect-[4/3] w-full" : "aspect-[4/5] w-[70%] sm:w-[60%]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(url, 900)} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
            <CalendarIcon width={14} height={14} />
            {fmt.long(place.visitedOn)}
          </span>
          <h2 className="mt-2 text-2xl font-semibold leading-tight">{place.name}</h2>
          {place.address && (
            <p className="mt-1 flex items-start gap-1 text-sm text-muted">
              <PinIcon width={16} height={16} className="mt-0.5 shrink-0" />
              <span className="line-clamp-2">{place.address}</span>
            </p>
          )}
        </div>
        <button onClick={onClose} aria-label="ปิด" className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200">
          <CloseIcon width={18} height={18} />
        </button>
      </div>

      {place.note && <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-700">{place.note}</p>}

      <div className="grid grid-cols-3 gap-2 pt-1">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-zinc-100 text-sm font-medium hover:bg-zinc-200"
        >
          <NavigateIcon width={16} height={16} /> นำทาง
        </a>
        <button onClick={onEdit} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-zinc-100 text-sm font-medium hover:bg-zinc-200">
          <EditIcon width={16} height={16} /> แก้ไข
        </button>
        <button
          onClick={async () => {
            if (!confirming) return setConfirming(true);
            setDeleting(true);
            await onDelete().finally(() => setDeleting(false));
          }}
          onBlur={() => setConfirming(false)}
          className={`flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition ${
            confirming ? "bg-brand text-white" : "bg-zinc-100 text-brand hover:bg-brand-soft"
          }`}
        >
          {deleting ? <Spinner /> : <TrashIcon width={16} height={16} />}
          {confirming ? "ยืนยันลบ" : "ลบ"}
        </button>
      </div>
    </div>
  );
}
