import "server-only";
import { db } from "./db";
import { NOTE_TTL_MS, type Note } from "./types";

type Row = { id: string; text: string; created_at: string };
const toNote = (r: Row): Note => ({ id: r.id, text: r.text, createdAt: r.created_at });

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (res.error.code === "42P01" || res.error.code === "PGRST205")
      throw new Error("ยังไม่มีตาราง notes — รัน supabase/notes.sql ใน Supabase SQL Editor ก่อน");
    throw new Error(res.error.message);
  }
  return res.data;
}

const cutoff = () => new Date(Date.now() - NOTE_TTL_MS).toISOString();

/** Notes posted within the last 24 hours, newest first. */
export async function listActiveNotes(): Promise<Note[]> {
  const rows = check(
    await db().from("notes").select("*").gt("created_at", cutoff()).order("created_at", { ascending: false }).limit(20)
  ) as Row[];
  return rows.map(toNote);
}

export async function createNote(text: string): Promise<Note> {
  const row = check(await db().from("notes").insert({ text }).select().single()) as Row;
  // housekeeping: drop notes that expired more than a day ago
  await db()
    .from("notes")
    .delete()
    .lt("created_at", new Date(Date.now() - 2 * NOTE_TTL_MS).toISOString())
    .then(() => {}, () => {});
  return toNote(row);
}

export async function deleteNote(id: string) {
  check(await db().from("notes").delete().eq("id", id));
}
