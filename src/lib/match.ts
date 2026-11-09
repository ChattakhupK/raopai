import "server-only";
import { db } from "./db";
import { matchFor, PER_DAY } from "./matchQuestions";
import type { MatchDay, MatchRound, MatchStats } from "./types";

type Who = "a" | "b";
type Row = { day: string; author: Who; choice: 0 | 1; slot: number };

/** The game started on this day — earlier rows (test data) don't count. */
const GAME_START = "2026-11-09";

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (res.error.code === "42P01" || res.error.code === "PGRST205")
      throw new Error("ยังไม่มีตาราง match_answers — รัน supabase/match.sql ใน Supabase SQL Editor ก่อน");
    if (res.error.code === "42703" || /slot/.test(res.error.message))
      throw new Error("ตารางยังไม่รองรับวันละ 5 ข้อ — รัน supabase/match-5.sql ใน Supabase SQL Editor ก่อน");
    throw new Error(res.error.message);
  }
  return res.data;
}

const other = (w: Who): Who => (w === "a" ? "b" : "a");

function shape(day: string, rows: Row[], me: Who): MatchDay {
  const rounds: MatchRound[] = Array.from({ length: PER_DAY }, (_, slot) => {
    const q = matchFor(day, slot);
    const mine = rows.find((r) => r.slot === slot && r.author === me)?.choice ?? null;
    const theirsRow = rows.find((r) => r.slot === slot && r.author === other(me));
    const theirs = mine !== null && theirsRow ? theirsRow.choice : null;
    return {
      slot,
      question: q.q,
      options: [q.a, q.b],
      mine,
      theirs,
      theirsAnswered: !!theirsRow,
      matched: mine !== null && theirs !== null ? mine === theirs : null,
    };
  });
  const both = rounds.filter((r) => r.matched !== null);
  return {
    day,
    rounds,
    myDone: rounds.filter((r) => r.mine !== null).length,
    theirsDone: rounds.filter((r) => r.theirsAnswered).length,
    played: both.length,
    matched: both.filter((r) => r.matched).length,
  };
}

async function rowsFor(filter: { day?: string; before?: string }) {
  let query = db().from("match_answers").select("day, author, choice, slot");
  if (filter.day) query = query.eq("day", filter.day);
  if (filter.before) query = query.lte("day", filter.before).gte("day", GAME_START);
  const rows = check(await query.order("day", { ascending: false }).limit(2000)) as Row[];
  return rows.map((r) => ({
    ...r,
    day: String(r.day).slice(0, 10),
    choice: Number(r.choice) as 0 | 1,
    slot: Number(r.slot ?? 0),
  }));
}

export async function getMatch(day: string, me: Who): Promise<MatchDay> {
  return shape(day, await rowsFor({ day }), me);
}

export async function pick(day: string, me: Who, slot: number, choice: 0 | 1): Promise<MatchDay> {
  const res = await db().from("match_answers").insert({ day, author: me, slot, choice });
  // already picked this one → keep the first pick (no changing answers)
  if (res.error && res.error.code !== "23505") check(res);
  return getMatch(day, me);
}

export async function stats(me: Who, today: string): Promise<MatchStats> {
  const rows = await rowsFor({ before: today });
  const byDay = new Map<string, Row[]>();
  for (const r of rows) byDay.set(r.day, [...(byDay.get(r.day) ?? []), r]);
  const days = [...byDay.keys()].sort((a, b) => b.localeCompare(a)).map((d) => shape(d, byDay.get(d)!, me));

  const complete = (d: MatchDay) => d.played === PER_DAY;
  let streak = 0;
  // today may still be in progress — don't let it break the streak
  for (const d of days.filter((d) => d.day !== today || complete(d))) {
    if (!complete(d)) break;
    streak++;
  }
  return {
    played: days.reduce((n, d) => n + d.played, 0),
    matched: days.reduce((n, d) => n + d.matched, 0),
    perfectDays: days.filter((d) => complete(d) && d.matched === PER_DAY).length,
    streak,
    history: days.filter((d) => d.day !== today && d.played > 0).slice(0, 30),
  };
}
