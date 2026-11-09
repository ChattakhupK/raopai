import { NextResponse } from "next/server";
import { getDay, history, saveAnswer, type Who } from "@/lib/daily";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const who = (v: unknown): Who | null => (v === "a" || v === "b" ? v : null);

// GET /api/daily?day=YYYY-MM-DD&me=a[&history=1]
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const day = sp.get("day") ?? "";
  const me = who(sp.get("me"));
  if (!DAY.test(day) || !me) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    if (sp.get("history")) return NextResponse.json(await history(me, day));
    return NextResponse.json(await getDay(day, me));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST { day, me, answer } — create or edit my answer for that day
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { day?: unknown; me?: unknown; answer?: unknown };
  const day = typeof b.day === "string" ? b.day : "";
  const me = who(b.me);
  const answer = typeof b.answer === "string" ? b.answer.trim() : "";
  if (!DAY.test(day) || !me) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!answer) return NextResponse.json({ error: "พิมพ์คำตอบก่อนนะ" }, { status: 400 });
  if (answer.length > 500) return NextResponse.json({ error: "คำตอบยาวเกิน 500 ตัวอักษร" }, { status: 400 });
  try {
    return NextResponse.json(await saveAnswer(day, me, answer));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
