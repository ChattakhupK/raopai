import { NextResponse } from "next/server";
import { getMatch, pick, stats } from "@/lib/match";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const who = (v: unknown) => (v === "a" || v === "b" ? v : null);

// GET /api/match?day=YYYY-MM-DD&me=a[&stats=1]
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const day = sp.get("day") ?? "";
  const me = who(sp.get("me"));
  if (!DAY.test(day) || !me) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    if (sp.get("stats")) return NextResponse.json(await stats(me, day));
    return NextResponse.json(await getMatch(day, me));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST { day, me, choice: 0 | 1 } — first pick of the day is final
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { day?: unknown; me?: unknown; choice?: unknown };
  const day = typeof b.day === "string" ? b.day : "";
  const me = who(b.me);
  const choice = b.choice === 0 || b.choice === 1 ? b.choice : null;
  if (!DAY.test(day) || !me || choice === null) return NextResponse.json({ error: "bad request" }, { status: 400 });
  try {
    return NextResponse.json(await pick(day, me, choice));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
