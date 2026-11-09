import "server-only";
import { db } from "./db";
import { questionFor } from "./questions";

export type Who = "a" | "b";
// theirs is only revealed once I have answered too
export type { DailyDay } from "./types";
import type { DailyDay } from "./types";

type Row = { day: string; author: Who; answer: string };

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (res.error.code === "42P01" || res.error.code === "PGRST205")
      throw new Error("ยังไม่มีตาราง daily_answers — รัน supabase/daily.sql ใน Supabase SQL Editor ก่อน");
    throw new Error(res.error.message);
  }
  return res.data;
}

const other = (w: Who): Who => (w === "a" ? "b" : "a");

function shape(day: string, rows: Row[], me: Who): DailyDay {
  const mine = rows.find((r) => r.author === me)?.answer ?? null;
  const theirsRow = rows.find((r) => r.author === other(me));
  return {
    day,
    question: questionFor(day).text,
    mine,
    theirs: mine ? (theirsRow?.answer ?? null) : null,
    theirsAnswered: !!theirsRow,
  };
}

export async function getDay(day: string, me: Who): Promise<DailyDay> {
  const rows = check(await db().from("daily_answers").select("day, author, answer").eq("day", day)) as Row[];
  return shape(day, rows, me);
}

export async function saveAnswer(day: string, me: Who, answer: string): Promise<DailyDay> {
  check(
    await db()
      .from("daily_answers")
      .upsert({ day, author: me, answer, updated_at: new Date().toISOString() }, { onConflict: "day,author" })
  );
  return getDay(day, me);
}

/** Past days where I answered (newest first), with the partner's answer if they did. */
export async function history(me: Who, before: string, limit = 30): Promise<DailyDay[]> {
  const rows = check(
    await db()
      .from("daily_answers")
      .select("day, author, answer")
      .lt("day", before)
      .order("day", { ascending: false })
      .limit(limit * 2)
  ) as Row[];
  const byDay = new Map<string, Row[]>();
  for (const r of rows) {
    const d = String(r.day).slice(0, 10);
    byDay.set(d, [...(byDay.get(d) ?? []), r]);
  }
  return [...byDay.entries()]
    .map(([d, rs]) => shape(d, rs, me))
    .filter((x) => x.mine)
    .slice(0, limit);
}
