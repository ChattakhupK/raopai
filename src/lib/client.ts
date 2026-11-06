"use client";
import type { Place, PlaceInput, SearchResult } from "./types";

async function json<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "เกิดข้อผิดพลาด");
  return data as T;
}

export const api = {
  list: () => fetch("/api/places", { cache: "no-store" }).then((r) => json<Place[]>(r)),
  create: (p: PlaceInput) =>
    fetch("/api/places", { method: "POST", body: JSON.stringify(p) }).then((r) => json<Place>(r)),
  update: (id: string, p: PlaceInput) =>
    fetch(`/api/places/${id}`, { method: "PATCH", body: JSON.stringify(p) }).then((r) => json<Place>(r)),
  remove: (id: string) => fetch(`/api/places/${id}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),
  search: (q: string, near?: { lat: number; lng: number }, signal?: AbortSignal) => {
    const u = new URLSearchParams({ q });
    if (near) {
      u.set("lat", near.lat.toFixed(4));
      u.set("lng", near.lng.toFixed(4));
    }
    return fetch(`/api/search?${u}`, { signal }).then((r) => json<SearchResult[]>(r));
  },
  reverse: (lat: number, lng: number) =>
    fetch(`/api/search?reverse=1&lat=${lat}&lng=${lng}`)
      .then((r) => json<SearchResult | null>(r))
      .catch(() => null),
  /** Browser → Cloudinary signed upload. Returns the stored https URL. */
  upload: async (file: File) => {
    const [sig, resized] = await Promise.all([
      fetch("/api/upload", { method: "POST" }).then((r) =>
        json<{ cloudName: string; apiKey: string; folder: string; timestamp: number; signature: string }>(r)
      ),
      resizeImage(file),
    ]);
    const fd = new FormData();
    fd.append("file", resized);
    fd.append("api_key", sig.apiKey);
    fd.append("timestamp", String(sig.timestamp));
    fd.append("signature", sig.signature);
    fd.append("folder", sig.folder);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: "POST",
      body: fd,
    });
    const data = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
    if (!res.ok || !data.secure_url) throw new Error(data.error?.message || "อัปโหลดรูปไม่สำเร็จ");
    return { url: data.secure_url };
  },
};

/** Downscale to max 1800px JPEG so uploads are fast and small. */
export async function resizeImage(file: File, max = 1800, quality = 0.82): Promise<File> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

const dateFmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" });
const longFmt = new Intl.DateTimeFormat("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const monthFmt = new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" });
const yearFmt = new Intl.DateTimeFormat("th-TH", { year: "numeric" });

const toDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const fmt = {
  date: (ymd: string) => dateFmt.format(toDate(ymd)),
  long: (ymd: string) => longFmt.format(toDate(ymd)),
  month: (ymd: string) => monthFmt.format(toDate(ymd)),
  year: (y: string) => yearFmt.format(new Date(Number(y), 0, 1)),
};

export function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
