import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { publicIdOf } from "./photos";

export const FOLDER = "raopai";

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
export function signUpload() {
  const { cloud_name, api_key, api_secret } = cloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000);
  const params = { folder: FOLDER, timestamp };
  const signature = cloudinary.utils.api_sign_request(params, api_secret);
  return { cloudName: cloud_name, apiKey: api_key, folder: FOLDER, timestamp, signature };
}

export async function deletePhotos(urls: string[]) {
  const ids = urls.map(publicIdOf).filter((x): x is string => !!x && x.startsWith(`${FOLDER}/`));
  if (!ids.length) return;
  cloudinaryConfig();
  await cloudinary.api.delete_resources(ids).catch(() => {});
}
