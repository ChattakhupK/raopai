import { NextResponse } from "next/server";
import { signUpload } from "@/lib/cloudinary";

// Returns a short-lived signature; the browser uploads straight to Cloudinary (no 4.5 MB function limit).
export async function POST() {
  try {
    return NextResponse.json(signUpload());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
