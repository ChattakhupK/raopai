"use client";
import type { DailyDay, MatchDay, MatchStats, Note, Place, PlaceInput, SearchResult } from "./types";
import { MAX_VIDEO_BYTES } from "./photos";

type Signature = {
  cloudName: string;
  apiKey: string;
  kind: "image" | "video";
  params: Record<string, string | number>;
  signature: string;
};

async function uploadSigned(
  file: File,
  kind: "image" | "video",
  raw: boolean,
  onProgress?: (p: number) => void
): Promise<{ url: string }> {
  const sig = await fetch(`/api/upload?kind=${kind}${raw ? "&raw=1" : ""}`, { method: "POST" }).then((r) =>
    json<Signature>(r)
  );
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", sig.apiKey);
  fd.append("signature", sig.signature);
  for (const [k, v] of Object.entries(sig.params)) fd.append(k, String(v));

  // XHR (not fetch) so large videos can report upload progress.
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/${kind}/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let data: { secure_url?: string; error?: { message?: string } } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data.secure_url) resolve({ url: data.secure_url });
      else reject(new Error(data.error?.message || "อัปโหลดไม่สำเร็จ"));
    };
    xhr.onerror = () => reject(new Error("อัปโหลดไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ต"));
    xhr.send(fd);
  });
}

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
  /**
   * Browser → Cloudinary signed upload (images are downscaled first). Returns the stored https URL.
   * onProgress receives 0–1 while bytes are sent.
   */
  upload: async (file: File, onProgress?: (p: number) => void): Promise<{ url: string }> => {
    const video = file.type.startsWith("video/");
    if (video && file.size > MAX_VIDEO_BYTES) {
      throw new Error(`วิดีโอใหญ่ ${(file.size / 1048576).toFixed(0)} MB เกิน 100 MB — ลองตัดคลิปให้สั้นลง`);
    }
    const body = video ? file : await resizeImage(file);
    try {
      return await uploadSigned(body, video ? "video" : "image", false, onProgress);
    } catch (e) {
      // Very large clips can't be shrunk during upload — store them as-is instead of failing.
      if (video && /synchronous|too large/i.test((e as Error).message)) {
        return uploadSigned(body, "video", true, onProgress);
      }
      throw e;
    }
  },
  notes: () => fetch("/api/notes", { cache: "no-store" }).then((r) => json<Note[]>(r)),
  postNote: (text: string) =>
    fetch("/api/notes", { method: "POST", body: JSON.stringify({ text }) }).then((r) => json<Note>(r)),
  deleteNote: (id: string) => fetch(`/api/notes/${id}`, { method: "DELETE" }).then((r) => json<{ ok: true }>(r)),
  daily: (day: string, me: "a" | "b") =>
    fetch(`/api/daily?day=${day}&me=${me}`, { cache: "no-store" }).then((r) => json<DailyDay>(r)),
  dailyHistory: (day: string, me: "a" | "b") =>
    fetch(`/api/daily?day=${day}&me=${me}&history=1`, { cache: "no-store" }).then((r) => json<DailyDay[]>(r)),
  answerDaily: (day: string, me: "a" | "b", answer: string) =>
    fetch("/api/daily", { method: "POST", body: JSON.stringify({ day, me, answer }) }).then((r) => json<DailyDay>(r)),
  match: (day: string, me: "a" | "b") =>
    fetch(`/api/match?day=${day}&me=${me}`, { cache: "no-store" }).then((r) => json<MatchDay>(r)),
  matchStats: (day: string, me: "a" | "b") =>
    fetch(`/api/match?day=${day}&me=${me}&stats=1`, { cache: "no-store" }).then((r) => json<MatchStats>(r)),
  pickMatch: (day: string, me: "a" | "b", slot: number, choice: 0 | 1) =>
    fetch("/api/match", { method: "POST", body: JSON.stringify({ day, me, slot, choice }) }).then((r) =>
      json<MatchDay>(r)
    ),
  usage: () =>
    fetch("/api/usage").then((r) =>
      json<{ usedPercent: number; warnPercent: number; blockPercent: number; storageBytes: number }>(r)
    ),
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

const toDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const fmt = {
  date: (ymd: string) => dateFmt.format(toDate(ymd)),
  long: (ymd: string) => longFmt.format(toDate(ymd)),
  month: (ymd: string) => monthFmt.format(toDate(ymd)),
  /** Buddhist-era year number only, e.g. "2569" */
  year: (y: string) => String(Number(y) + 543),
};

export function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
