import { NextResponse } from "next/server";
import { createPlace, listPlaces, parsePlaceInput } from "@/lib/db";

export async function GET() {
  try {
    return NextResponse.json(await listPlaces());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const input = parsePlaceInput(await req.json().catch(() => null));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });
  try {
    return NextResponse.json(await createPlace(input), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
