import "server-only";
import { db } from "./db";
import { matchFor } from "./matchQuestions";
import type { MatchDay, MatchStats } from "./types";

type Who = "a" | "b";
type Row = { day: string; author: Who; choice: 0 | 1 };

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (res.error.code === "42P01" || res.error.code === "PGRST205")
      throw new Error("ยังไม่มีตาราง match_answers — รัน supabase/match.sql ใน Supabase SQL Editor ก่อน");
    throw new Error(res.error.message);
  }
  return res.data;
}

const other = (w: Who): Who => (w === "a" ? "b" : "a");

function shape(day: string, rows: Row[], me: Who): MatchDay {
  const q = matchFor(day);
  const mine = rows.find((r) => r.author === me)?.choice ?? null;
  const theirsRow = rows.find((r) => r.author === other(me));
  // the partner's pick stays secret until I've picked too
  const theirs = mine !== null && theirsRow ? theirsRow.choice : null;
  return {
    day,
    question: q.q,
    options: [q.a, q.b],
    mine,
    theirs,
    theirsAnswered: !!theirsRow,
    matched: mine !== null && theirs !== null ? mine === theirs : null,
  };
}

async function rowsFor(filter: { day?: string; before?: string }) {
  let query = db().from("match_answers").select("day, author, choice");
  if (filter.day) query = query.eq("day", filter.day);
  if (filter.before) query = query.lte("day", filter.before);
  const rows = check(await query.order("day", { ascending: false }).limit(800)) as Row[];
  return rows.map((r) => ({ ...r, day: String(r.day).slice(0, 10), choice: Number(r.choice) as 0 | 1 }));
}

export async function getMatch(day: string, me: Who): Promise<MatchDay> {
  return shape(day, await rowsFor({ day }), me);
}

export async function pick(day: string, me: Who, choice: 0 | 1): Promise<MatchDay> {
  const res = await db().from("match_answers").insert({ day, author: me, choice });
  // already picked today → keep the first pick (no changing answers)
  if (res.error && res.error.code !== "23505") check(res);
  return getMatch(day, me);
}

/** Rounds both of us played up to `today`: score, current streak, and recent history. */
/** The game started on this day — earlier rows (e.g. test data) don't count. */
const GAME_START = "2026-11-09";

export async function stats(me: Who, today: string): Promise<MatchStats> {
  const rows = (await rowsFor({ before: today })).filter((r) => r.day >= GAME_START);
  const byDay = new Map<string, Row[]>();
  for (const r of rows) byDay.set(r.day, [...(byDay.get(r.day) ?? []), r]);
  const played = [...byDay.entries()]
    .filter(([, rs]) => rs.length === 2)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([d, rs]) => shape(d, rs, me));
  let streak = 0;
  for (const d of played) {
    if (!d.matched) break;
    streak++;
  }
  return {
    played: played.length,
    matched: played.filter((d) => d.matched).length,
    streak,
    history: played.filter((d) => d.day !== today).slice(0, 30),
  };
}
