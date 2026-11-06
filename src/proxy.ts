import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isAuthed } from "@/lib/auth";

export async function proxy(req: NextRequest) {
  if (await isAuthed(req.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|manifest.webmanifest|sw.js|pwa-icon|icon|apple-icon|favicon.ico).*)",
  ],
};
