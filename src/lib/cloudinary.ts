import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { assetOf } from "./photos";

export const FOLDER = "raopai";

/** Videos are shrunk on upload (long side 1280px ≈ 720p) and only that copy is stored. */
export const VIDEO_INCOMING = "c_limit,w_1280,h_1280,q_auto";

export const WARN_PERCENT = 80;
export const VIDEO_BLOCK_PERCENT = 95;

export function cloudinaryConfig() {
  // Accept either CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud> or the three separate vars.
  const fromUrl = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(process.env.CLOUDINARY_URL ?? "");
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || fromUrl?.[3];
  const api_key = process.env.CLOUDINARY_API_KEY || fromUrl?.[1];
  const api_secret = process.env.CLOUDINARY_API_SECRET || fromUrl?.[2];
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("ยังไม่ได้ตั้งค่า CLOUDINARY_URL ใน .env.local");
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return { cloud_name, api_key, api_secret };
}

/** Signature for a direct browser → Cloudinary upload (the secret never leaves the server). */
export function signUpload(kind: "image" | "video", raw = false) {
  const { cloud_name, api_key, api_secret } = cloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000);
  const params: Record<string, string | number> = { folder: FOLDER, timestamp };
  // raw: retry path for clips too large for Cloudinary to shrink during upload
  if (kind === "video" && !raw) params.transformation = VIDEO_INCOMING;
  const signature = cloudinary.utils.api_sign_request(params, api_secret);
  return { cloudName: cloud_name, apiKey: api_key, kind, params, signature };
}

export async function deletePhotos(urls: string[]) {
  const assets = urls
    .map(assetOf)
    .filter((a): a is { id: string; type: "image" | "video" } => !!a && a.id.startsWith(`${FOLDER}/`));
  if (!assets.length) return;
  cloudinaryConfig();
  for (const type of ["image", "video"] as const) {
    const ids = assets.filter((a) => a.type === type).map((a) => a.id);
    if (ids.length) await cloudinary.api.delete_resources(ids, { resource_type: type }).catch(() => {});
  }
}

export type Usage = {
  usedPercent: number;
  usedCredits: number;
  limitCredits: number;
  storageBytes: number;
  plan: string;
};

let usageCache: { at: number; value: Usage } | null = null;

/** Monthly credit usage, cached 5 min (the Admin API is rate-limited). */
export async function getUsage(): Promise<Usage> {
  if (usageCache && Date.now() - usageCache.at < 5 * 60_000) return usageCache.value;
  cloudinaryConfig();
  const u = await cloudinary.api.usage();
  const value: Usage = {
    usedPercent: Number(u.credits?.used_percent ?? 0),
    usedCredits: Number(u.credits?.usage ?? 0),
    limitCredits: Number(u.credits?.limit ?? 0),
    storageBytes: Number(u.storage?.usage ?? 0),
    plan: String(u.plan ?? ""),
  };
  usageCache = { at: Date.now(), value };
  return value;
}
