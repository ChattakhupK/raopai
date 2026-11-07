import { NextResponse } from "next/server";
import { getUsage, signUpload, VIDEO_BLOCK_PERCENT } from "@/lib/cloudinary";

// Returns a short-lived signature; the browser uploads straight to Cloudinary (no 4.5 MB function limit).
export async function POST(req: Request) {
  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind") === "video" ? "video" : "image";
  try {
    if (kind === "video") {
      const usage = await getUsage().catch(() => null);
      if (usage && usage.usedPercent >= VIDEO_BLOCK_PERCENT) {
        return NextResponse.json(
          { error: `พื้นที่ Cloudinary ใช้ไปแล้ว ${usage.usedPercent.toFixed(0)}% — งดอัปโหลดวิดีโอชั่วคราว (ยังใส่รูปได้)` },
          { status: 403 }
        );
      }
    }
    return NextResponse.json(signUpload(kind, sp.get("raw") === "1"));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
