"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { isVideo, thumb } from "@/lib/photos";
import type { Place, PlaceInput } from "@/lib/types";
import { CameraIcon, CloseIcon, PinIcon, PlayIcon, Spinner } from "./icons";

type Usage = { usedPercent: number; warnPercent: number; blockPercent: number };
let usageCache: { at: number; value: Usage } | null = null;

/** Cloudinary monthly quota bar; turns orange near the limit and red when videos are paused. */
function UsageMeter({ usage }: { usage: Usage | null }) {
  if (!usage) return null;
  const pct = usage.usedPercent;
  const tone = pct >= usage.blockPercent ? "bg-brand" : pct >= usage.warnPercent ? "bg-amber-500" : "bg-zinc-300";
  const label =
    pct >= usage.blockPercent
      ? "พื้นที่เต็ม — งดวิดีโอชั่วคราว"
      : pct >= usage.warnPercent
        ? "พื้นที่ใกล้เต็มแล้ว"
        : "พื้นที่ที่ใช้";
  return (
    <span className="flex items-center gap-1.5" title="โควตา Cloudinary รายเดือน (รีเซ็ตทุกเดือน)">
      <span className={pct >= usage.warnPercent ? "font-medium text-brand" : ""}>
        {label} {pct < 1 ? pct.toFixed(1) : pct.toFixed(0)}%
      </span>
      <span className="h-1 w-10 overflow-hidden rounded-full bg-zinc-100">
        <span className={`block h-full rounded-full ${tone}`} style={{ width: `${Math.max(3, Math.min(100, pct))}%` }} />
      </span>
    </span>
  );
}

export type Draft = PlaceInput & { id?: string };

type Props = {
  draft: Draft;
  onChange: (update: (d: Draft) => Draft) => void;
  onCancel: () => void;
  onSaved: (p: Place) => void;
  onMovePin: () => void;
};

export function PlaceForm({ draft, onChange, onCancel, onSaved, onMovePin }: Props) {
  // in-flight uploads: id → progress 0..1 (+ whether it's a video, for the label)
  const [uploads, setUploads] = useState<{ id: number; progress: number; video: boolean }[]>([]);
  const uploading = uploads.length;
  const [usage, setUsage] = useState<Usage | null>(usageCache?.value ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photos = draft.photos ?? [];
  const set = (patch: Partial<Draft>) => onChange((d) => ({ ...d, ...patch }));
  const videosBlocked = !!usage && usage.usedPercent >= usage.blockPercent;

  useEffect(() => {
    if (usageCache && Date.now() - usageCache.at < 5 * 60_000) return;
    api
      .usage()
      .then((u) => {
        usageCache = { at: Date.now(), value: u };
        setUsage(u);
      })
      .catch(() => {});
  }, []);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    let list = Array.from(files).slice(0, 20);
    if (videosBlocked && list.some((f) => f.type.startsWith("video/"))) {
      setError("พื้นที่ Cloudinary ใกล้เต็ม งดอัปโหลดวิดีโอชั่วคราว (ยังใส่รูปได้)");
      list = list.filter((f) => !f.type.startsWith("video/"));
    }
    await Promise.all(
      list.map(async (f) => {
        const id = Math.random();
        const video = f.type.startsWith("video/");
        setUploads((u) => [...u, { id, progress: 0, video }]);
        try {
          const { url } = await api.upload(f, (p) =>
            setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress: p } : x)))
          );
          onChange((d) => ({ ...d, photos: [...(d.photos ?? []), url] }));
          if (video) usageCache = null; // refresh the meter next time
        } catch (e) {
          setError((e as Error).message || "อัปโหลดไม่สำเร็จ");
        } finally {
          setUploads((u) => u.filter((x) => x.id !== id));
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
        <span className="flex items-center justify-between gap-2 text-xs text-muted">
          <span>รูป / วิดีโอ {photos.length > 0 && `(${photos.length})`}</span>
          <UsageMeter usage={usage} />
        </span>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-brand/30 text-brand hover:bg-brand-soft"
          >
            <CameraIcon width={18} height={18} />
            <span className="text-[11px] font-medium">{videosBlocked ? "เพิ่มรูป" : "รูป/วิดีโอ"}</span>
          </button>
          {uploads.map((u) => (
            <div
              key={u.id}
              className="relative flex size-16 shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg bg-zinc-100 text-brand"
            >
              <Spinner className="size-4" />
              <span className="text-[11px] font-medium tabular-nums">
                {u.progress < 1 ? `${Math.round(u.progress * 100)}%` : u.video ? "กำลังแปลง" : "…"}
              </span>
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand/20">
                <span className="block h-full origin-left bg-brand transition-transform" style={{ transform: `scaleX(${u.progress})` }} />
              </span>
            </div>
          ))}
          {photos.map((url) => (
            <div key={url} className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(url, 200)} alt="" className="size-full object-cover" />
              {isVideo(url) && (
                <span className="absolute bottom-1 left-1 grid size-5 place-items-center rounded-full bg-black/55 text-white">
                  <PlayIcon width={10} height={10} />
                </span>
              )}
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
          accept={videosBlocked ? "image/*" : "image/*,video/*"}
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
      <div className="sticky bottom-0 -mx-4 border-t border-line bg-white px-4 pb-1 pt-3">
        <button
          type="submit"
          disabled={saving || uploading > 0}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
        >
          {saving && <Spinner className="size-4" />}
          {uploading > 0 ? "กำลังอัปโหลด…" : draft.id ? "บันทึกการแก้ไข" : "บันทึกหมุด"}
        </button>
      </div>
    </form>
  );
}
