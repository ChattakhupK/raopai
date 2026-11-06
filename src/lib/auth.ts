// Shared passcode auth. Works in both proxy and route handlers (Web Crypto only).
export const AUTH_COOKIE = "raopai_auth";

export function authEnabled() {
  return !!process.env.APP_PASSCODE;
}

export async function expectedToken(): Promise<string> {
  const pass = process.env.APP_PASSCODE ?? "";
  const data = new TextEncoder().encode(`raopai:v1:${pass}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function isAuthed(token: string | undefined) {
  if (!authEnabled()) return true;
  if (!token) return false;
  return token === (await expectedToken());
}
