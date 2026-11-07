"use client";
import { useRef, useState } from "react";
import { api } from "@/lib/client";
import { thumb } from "@/lib/photos";
import type { Place, PlaceInput } from "@/lib/types";
import { CameraIcon, CloseIcon, PinIcon, Spinner } from "./icons";

export type Draft = PlaceInput & { id?: string };

type Props = {
  draft: Draft;
  onChange: (update: (d: Draft) => Draft) => void;
  onCancel: () => void;
  onSaved: (p: Place) => void;
  onMovePin: () => void;
};

export function PlaceForm({ draft, onChange, onCancel, onSaved, onMovePin }: Props) {
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photos = draft.photos ?? [];
  const set = (patch: Partial<Draft>) => onChange((d) => ({ ...d, ...patch }));

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files).slice(0, 20);
    setUploading((n) => n + list.length);
    await Promise.all(
      list.map(async (f) => {
        try {
          const { url } = await api.upload(f);
          onChange((d) => ({ ...d, photos: [...(d.photos ?? []), url] }));
        } catch (e) {
          setError((e as Error).message || "อัปโหลดรูปไม่สำเร็จ");
        } finally {
          setUploading((n) => n - 1);
        }
      })
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (uploading) return;
    setSaving(true);
    setError(null);
    try {
      const { id, ...input } = draft;
      const place = id ? await api.update(id, input) : await api.create(input);
      onSaved(place);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const input =
    "h-10 w-full rounded-lg border border-line bg-zinc-50 px-3 text-sm outline-none transition focus:border-brand/40 focus:bg-white";

  return (
    <form onSubmit={save} className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{draft.id ? "แก้ไขหมุด" : "ปักหมุดใหม่"}</h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="ปิด"
          className="grid size-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
        >
          <CloseIcon width={16} height={16} />
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-brand-soft px-3 py-2">
        <PinIcon width={16} height={16} className="shrink-0 text-brand" />
        <p className="min-w-0 flex-1 truncate text-xs text-zinc-600">
          {draft.address || `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}`}
        </p>
        <button type="button" onClick={onMovePin} className="shrink-0 text-xs font-medium text-brand hover:underline">
          ย้ายหมุด
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">ชื่อสถานที่</span>
        <input
          required
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="เช่น คาเฟ่ริมทะเล"
          className={input}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">วันที่ไป</span>
        <input
          type="date"
          required
          value={draft.visitedOn}
          onChange={(e) => set({ visitedOn: e.target.value })}
          className={`${input} appearance-none`}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted">รูปภาพ {photos.length > 0 && `(${photos.length})`}</span>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-brand/30 text-brand hover:bg-brand-soft"
          >
            <CameraIcon width={18} height={18} />
            <span className="text-[10px] font-medium">เพิ่มรูป</span>
          </button>
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className="grid size-16 shrink-0 place-items-center rounded-lg bg-zinc-100 text-brand">
              <Spinner />
            </div>
          ))}
          {photos.map((url) => (
            <div key={url} className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(url, 200)} alt="" className="size-full object-cover" />
              <button
                type="button"
                aria-label="ลบรูป"
                onClick={() => onChange((d) => ({ ...d, photos: (d.photos ?? []).filter((u) => u !== url) }))}
                className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
              >
                <CloseIcon width={11} height={11} />
              </button>
            </div>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">โน้ต</span>
        <textarea
          rows={2}
          value={draft.note ?? ""}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="วันนั้นเราทำอะไรกันบ้าง…"
          className="resize-none rounded-lg border border-line bg-zinc-50 px-3 py-2 text-sm outline-none transition focus:border-brand/40 focus:bg-white"
        />
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-brand-dark">{error}</p>}

      {/* pinned to the bottom of the sheet so saving is always one tap away */}
      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-white from-70% to-transparent px-4 pb-1 pt-3">
        <button
          type="submit"
          disabled={saving || uploading > 0}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-medium text-white shadow-[0_4px_14px_rgba(225,29,46,0.25)] transition hover:bg-brand-dark disabled:opacity-60"
        >
          {saving && <Spinner className="size-4" />}
          {uploading > 0 ? "กำลังอัปโหลดรูป…" : draft.id ? "บันทึกการแก้ไข" : "บันทึกหมุด"}
        </button>
      </div>
    </form>
  );
}
