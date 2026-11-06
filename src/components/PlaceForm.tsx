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

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand">
            {draft.id ? "แก้ไขความทรงจำ" : "ความทรงจำใหม่"}
          </p>
          <h2 className="mt-1 text-xl font-semibold">{draft.id ? "แก้ไขหมุด" : "ปักหมุดที่นี่"}</h2>
        </div>
        <button type="button" onClick={onCancel} aria-label="ปิด" className="grid size-9 place-items-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200">
          <CloseIcon width={18} height={18} />
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">ชื่อสถานที่</span>
        <input
          required
          value={draft.name}
          onChange={(e) => set({ name: e.target.value })}
          placeholder="เช่น คาเฟ่ริมทะเล"
          className="h-12 rounded-xl border border-line bg-zinc-50 px-4 text-[15px] outline-none focus:border-brand/50 focus:bg-white"
        />
      </label>

      <div className="flex items-center gap-3 rounded-xl bg-brand-soft px-4 py-3">
        <PinIcon className="shrink-0 text-brand" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{draft.address || "ตำแหน่งที่เลือกบนแผนที่"}</p>
          <p className="text-xs text-muted">
            {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
          </p>
        </div>
        <button type="button" onClick={onMovePin} className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-brand ring-1 ring-brand/20 hover:bg-brand hover:text-white">
          ย้ายหมุด
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">วันที่ไป</span>
        <input
          type="date"
          required
          value={draft.visitedOn}
          onChange={(e) => set({ visitedOn: e.target.value })}
          className="h-12 w-full appearance-none rounded-xl border border-line bg-zinc-50 px-4 text-[15px] outline-none focus:border-brand/50 focus:bg-white"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">
          รูปภาพ <span className="font-normal text-muted">({photos.length})</span>
        </span>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((url) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(url, 300)} alt="" className="size-full object-cover" />
              <button
                type="button"
                aria-label="ลบรูป"
                onClick={() => onChange((d) => ({ ...d, photos: (d.photos ?? []).filter((u) => u !== url) }))}
                className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
              >
                <CloseIcon width={14} height={14} />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className="grid aspect-square place-items-center rounded-xl bg-zinc-100 text-brand">
              <Spinner />
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand/25 text-brand hover:bg-brand-soft"
          >
            <CameraIcon />
            <span className="text-xs font-medium">เพิ่มรูป</span>
          </button>
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

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">โน้ต</span>
        <textarea
          rows={3}
          value={draft.note ?? ""}
          onChange={(e) => set({ note: e.target.value })}
          placeholder="วันนั้นเราทำอะไรกันบ้าง…"
          className="resize-none rounded-xl border border-line bg-zinc-50 px-4 py-3 text-[15px] outline-none focus:border-brand/50 focus:bg-white"
        />
      </label>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-brand-dark">{error}</p>}

      <button
        type="submit"
        disabled={saving || uploading > 0}
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand font-medium text-white shadow-[0_8px_20px_rgba(225,29,46,0.3)] transition hover:bg-brand-dark disabled:opacity-60"
      >
        {saving && <Spinner />}
        {uploading > 0 ? "กำลังอัปโหลดรูป…" : draft.id ? "บันทึกการแก้ไข" : "บันทึกหมุด"}
      </button>
    </form>
  );
}
