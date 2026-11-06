import { NextResponse } from "next/server";
import { deletePhotos } from "@/lib/cloudinary";
import { deletePlace, getPlace, parsePlaceInput, updatePlace } from "@/lib/db";

const UUID = /^[0-9a-f-]{36}$/i;

export async function PATCH(req: Request, ctx: RouteContext<"/api/places/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const input = parsePlaceInput(await req.json().catch(() => null));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  try {
    const before = await getPlace(id);
    const place = await updatePlace(id, input);
    if (!place) return NextResponse.json({ error: "not found" }, { status: 404 });
    const removed = before?.photos.filter((u) => !place.photos.includes(u)) ?? [];
    if (removed.length) await deletePhotos(removed).catch(() => {});
    return NextResponse.json(place);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/places/[id]">) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    const place = await deletePlace(id);
    if (!place) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (place.photos.length) await deletePhotos(place.photos).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
