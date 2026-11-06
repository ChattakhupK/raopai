// Cloudinary URL helpers, safe on client and server.
// Stored URL form: https://res.cloudinary.com/<cloud>/image/upload/v<ver>/raopai/<id>.<ext>

const CLOUDINARY_RE = /^https:\/\/res\.cloudinary\.com\/([a-z0-9_-]+)\/image\/upload\/(v\d+\/)?([\w\-/]+)\.(\w+)$/i;

export function isOwnPhotoUrl(url: string) {
  const m = CLOUDINARY_RE.exec(url);
  const cloud = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL?.split("@")[1];
  return !!m && (!cloud || m[1] === cloud) && m[3].startsWith("raopai/");
}

/** public_id used by the Admin API to delete the image. */
export function publicIdOf(url: string): string | null {
  const m = CLOUDINARY_RE.exec(url);
  return m ? m[3] : null;
}

/** Insert an on-the-fly transformation, e.g. thumb(url, 400) → resized, auto format/quality. */
export function thumb(url: string, width: number) {
  if (!url.includes("res.cloudinary.com/")) return url;
  return url.replace("/image/upload/", `/image/upload/c_limit,w_${width},f_auto,q_auto/`);
}
