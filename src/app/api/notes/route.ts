import { NextResponse } from "next/server";
import { createNote, listActiveNotes } from "@/lib/notes";

export async function GET() {
  try {
    return NextResponse.json(await listActiveNotes());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { text?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "พิมพ์ข้อความก่อนนะ" }, { status: 400 });
  if (text.length > 300) return NextResponse.json({ error: "ข้อความยาวเกิน 300 ตัวอักษร" }, { status: 400 });
  try {
    return NextResponse.json(await createNote(text), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
