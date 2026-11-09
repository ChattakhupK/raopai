import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Place, PlaceInput } from "./types";
import { isOwnPhotoUrl } from "./photos";

let cached: SupabaseClient | null = null;

export function db() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the secret key (bypasses RLS). The publishable key also works if
  // supabase/policies-publishable.sql has been run. Only used on the server.
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("ยังไม่ได้ตั้งค่า Supabase URL / key ใน .env.local");
  }
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

type Row = {
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  visited_on: string;
  note: string | null;
  photos: string[] | null;
  created_at: string;
};

function toPlace(r: Row): Place {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    lat: Number(r.lat),
    lng: Number(r.lng),
    visitedOn: String(r.visited_on).slice(0, 10),
    note: r.note,
    photos: Array.isArray(r.photos) ? r.photos : [],
    createdAt: String(r.created_at),
  };
}

function toRow(p: PlaceInput) {
  return {
    name: p.name,
    address: p.address ?? null,
    lat: p.lat,
    lng: p.lng,
    visited_on: p.visitedOn,
    note: p.note ?? null,
    photos: p.photos ?? [],
  };
}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (res.error.code === "42P01" || res.error.code === "PGRST205")
      throw new Error("ยังไม่มีตาราง places — รัน supabase/schema.sql ใน Supabase SQL Editor ก่อน");
    throw new Error(res.error.message);
  }
  return res.data;
}

export async function listPlaces(): Promise<Place[]> {
  const rows = check(
    await db()
      .from("places")
      .select("*")
      .order("visited_on", { ascending: false })
      .order("created_at", { ascending: false })
  ) as Row[];
  return rows.map(toPlace);
}

export async function getPlace(id: string): Promise<Place | null> {
  const row = check(await db().from("places").select("*").eq("id", id).maybeSingle()) as Row | null;
  return row ? toPlace(row) : null;
}

export async function createPlace(p: PlaceInput): Promise<Place> {
  const row = check(await db().from("places").insert(toRow(p)).select().single()) as Row;
  return toPlace(row);
}

export async function updatePlace(id: string, p: PlaceInput): Promise<Place | null> {
  const row = check(await db().from("places").update(toRow(p)).eq("id", id).select().maybeSingle()) as Row | null;
  return row ? toPlace(row) : null;
}

export async function deletePlace(id: string): Promise<Place | null> {
  const row = check(await db().from("places").delete().eq("id", id).select().maybeSingle()) as Row | null;
  return row ? toPlace(row) : null;
}

export function parsePlaceInput(body: unknown): PlaceInput | string {
  if (!body || typeof body !== "object") return "invalid body";
  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  const visitedOn = typeof b.visitedOn === "string" ? b.visitedOn : "";
  if (!name) return "กรุณาใส่ชื่อสถานที่";
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return "พิกัดไม่ถูกต้อง";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitedOn)) return "วันที่ไม่ถูกต้อง";
  const photos = Array.isArray(b.photos)
    ? b.photos.filter((u): u is string => typeof u === "string" && isOwnPhotoUrl(u)).slice(0, 30)
    : [];
  return {
    name: name.slice(0, 200),
    address: typeof b.address === "string" ? b.address.slice(0, 500) : null,
    lat,
    lng,
    visitedOn,
    note: typeof b.note === "string" ? b.note.slice(0, 5000) : null,
    photos,
  };
}
