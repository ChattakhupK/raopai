import { NextResponse } from "next/server";
import { getUsage, VIDEO_BLOCK_PERCENT, WARN_PERCENT } from "@/lib/cloudinary";

export async function GET() {
  try {
    const usage = await getUsage();
    return NextResponse.json({ ...usage, warnPercent: WARN_PERCENT, blockPercent: VIDEO_BLOCK_PERCENT });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
