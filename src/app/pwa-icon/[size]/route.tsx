import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/icon-art";

export async function GET(req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const { size: raw } = await ctx.params;
  const size = raw === "512" ? 512 : 192;
  const maskable = new URL(req.url).searchParams.has("maskable");
  return new ImageResponse(<IconArt size={size} padded={maskable} />, {
    width: size,
    height: size,
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
