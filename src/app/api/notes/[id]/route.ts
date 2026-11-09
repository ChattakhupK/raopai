import { NextResponse } from "next/server";
import { deleteNote } from "@/lib/notes";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  try {
    await deleteNote(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
