// Cloudinary URL helpers, safe on client and server. Media items are stored as plain URLs:
//   https://res.cloudinary.com/<cloud>/image/upload/v<ver>/raopai/<id>.<ext>
//   https://res.cloudinary.com/<cloud>/video/upload/v<ver>/raopai/<id>.<ext>

const CLOUDINARY_RE =
  /^https:\/\/res\.cloudinary\.com\/([a-z0-9_-]+)\/(image|video)\/upload\/(v\d+\/)?([\w\-/]+)\.(\w+)$/i;

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // Cloudinary free plan per-file limit

export function isOwnPhotoUrl(url: string) {
  const m = CLOUDINARY_RE.exec(url);
  const cloud = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL?.split("@")[1];
  return !!m && (!cloud || m[1] === cloud) && m[4].startsWith("raopai/");
}

export function isVideo(url: string) {
  return url.includes("/video/upload/");
}

/** public_id + resource type, used by the Admin API to delete the asset. */
export function assetOf(url: string): { id: string; type: "image" | "video" } | null {
  const m = CLOUDINARY_RE.exec(url);
  return m ? { id: m[4], type: m[2].toLowerCase() as "image" | "video" } : null;
}

/**
 * Resized still for any media item: images are resized; videos return their first frame as JPG.
 * Used for pins, list thumbnails and slideshow posters.
 */
export function thumb(url: string, width: number) {
  if (!url.includes("res.cloudinary.com/")) return url;
  if (isVideo(url)) {
    return url
      .replace("/video/upload/", `/video/upload/so_0,c_limit,w_${width},q_auto/`)
      .replace(/\.\w+$/, ".jpg");
  }
  return url.replace("/image/upload/", `/image/upload/c_limit,w_${width},f_auto,q_auto/`);
}

/** Playable MP4 (H.264) that works in every browser, including iOS Safari. */
export function videoSrc(url: string) {
  return url.replace("/video/upload/", "/video/upload/q_auto,vc_h264/").replace(/\.\w+$/, ".mp4");
}
