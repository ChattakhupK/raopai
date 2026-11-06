import { NextResponse } from "next/server";
import type { SearchResult } from "@/lib/types";

type NominatimItem = {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
};

// Proxies OpenStreetMap Nominatim (free, no key). Policy: identify the app, max ~1 req/s.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("reverse")) return reverse(searchParams);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "8");
  url.searchParams.set("accept-language", "th,en");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  if (lat && lng) {
    // bias (not restrict) results around the current map view
    const d = 2;
    url.searchParams.set("viewbox", `${+lng - d},${+lat + d},${+lng + d},${+lat - d}`);
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "RaoPai/1.0 (personal travel journal)" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return NextResponse.json({ error: "search failed" }, { status: 502 });
  const items = (await res.json()) as NominatimItem[];
  const results: SearchResult[] = items.map((i) => {
    const parts = i.display_name.split(",").map((s) => s.trim());
    return {
      id: String(i.place_id),
      name: i.name || parts[0],
      address: parts.slice(1).join(", "),
      lat: Number(i.lat),
      lng: Number(i.lon),
    };
  });
  return NextResponse.json(results);
}

async function reverse(sp: URLSearchParams) {
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return NextResponse.json(null);
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("accept-language", "th,en");
  const res = await fetch(url, {
    headers: { "User-Agent": "RaoPai/1.0 (personal travel journal)" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) return NextResponse.json(null);
  const i = (await res.json()) as NominatimItem & { error?: string };
  if (i.error) return NextResponse.json(null);
  const parts = i.display_name.split(",").map((s) => s.trim());
  return NextResponse.json({
    id: String(i.place_id),
    name: i.name || "",
    address: (i.name ? parts.slice(1) : parts).join(", "),
    lat,
    lng,
  } satisfies SearchResult);
}
