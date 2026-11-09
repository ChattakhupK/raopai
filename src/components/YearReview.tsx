"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ANNIVERSARY } from "@/lib/config";
import { fmt } from "@/lib/client";
import { isVideo, thumb } from "@/lib/photos";
import type { Place } from "@/lib/types";
import { CloseIcon, HeartIcon } from "./icons";

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const SLIDE_MS = 5500;

/** Province from a Nominatim-style Thai address. */
export function provinceOf(address: string | null): string | null {
  if (!address) return null;
  if (/กรุงเทพ/.test(address)) return "กรุงเทพฯ";
  const m = address.match(/จังหวัด\s*([^,\d]+)/);
  if (m) return m[1].trim();
  const parts = address.split(",").map((s) => s.trim());
  const zip = parts.findIndex((p) => /^\d{5}$/.test(p));
  return zip > 0 ? parts[zip - 1].replace(/^จังหวัด/, "") : null;
}

function stats(places: Place[], year: string) {
  const list = places.filter((p) => p.visitedOn.startsWith(year)).sort((a, b) => a.visitedOn.localeCompare(b.visitedOn));
  const byMonth = Array(12).fill(0) as number[];
  const provinces = new Map<string, number>();
  let photos = 0;
  let videos = 0;
  for (const p of list) {
    byMonth[Number(p.visitedOn.slice(5, 7)) - 1]++;
    const pv = provinceOf(p.address);
    if (pv) provinces.set(pv, (provinces.get(pv) ?? 0) + 1);
    for (const u of p.photos) {
      if (isVideo(u)) videos++;
      else photos++;
    }
  }
  const busiest = byMonth.indexOf(Math.max(...byMonth));
  const topProvinces = [...provinces.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  // up to 9 images for the collage, spread across the year
  const media = list.flatMap((p) => p.photos.slice(0, 2));
  const step = Math.max(1, media.length / 9);
  const collage = Array.from({ length: Math.min(9, media.length) }, (_, k) => media[Math.floor(k * step)]);
  const end = new Date() < new Date(`${Number(year) + 1}-01-01`) ? new Date() : new Date(`${year}-12-31`);
  const daysTogether = Math.max(0, Math.round((end.getTime() - new Date(ANNIVERSARY).getTime()) / 86_400_000));
  return { list, byMonth, busiest, provinces, topProvinces, photos, videos, collage, daysTogether };
}

/** Full-screen story slides summarising one year of memories. Tap right/left to move, hold to pause. */
export function YearReview({ places, year, onClose }: { places: Place[]; year: string; onClose: () => void }) {
  const s = useMemo(() => stats(places, year), [places, year]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const beYear = fmt.year(year);
  const first = s.list[0];
  const last = s.list[s.list.length - 1];
  const maxMonth = Math.max(1, ...s.byMonth);

  const slides: { bg: string; body: React.ReactNode }[] = [
    {
      bg: "bg-brand",
      body: (
        <div className="flex flex-col items-center text-center">
          <div className="grid grid-cols-3 gap-1.5 opacity-90">
            {s.collage.slice(0, 6).map((u, k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={k} src={thumb(u, 200)} alt="" className={`size-20 rounded-xl object-cover ${k % 2 ? "rotate-3" : "-rotate-3"}`} />
            ))}
          </div>
          <p className="mt-8 text-sm text-white/80">RaoPai Rewind</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight">{beYear}</p>
          <p className="mt-2 text-lg">ปีของเราสองคน</p>
        </div>
      ),
    },
    {
      bg: "bg-white text-ink",
      body: (
        <div className="text-center">
          <p className="text-sm text-muted">ปีนี้เราไปด้วยกัน</p>
          <p className="mt-2 text-8xl font-semibold tabular-nums text-brand">{s.list.length}</p>
          <p className="text-2xl font-medium">ที่</p>
          <p className="mt-6 text-base text-zinc-600">
            ใน <span className="font-semibold text-brand">{s.provinces.size}</span> จังหวัด ·{" "}
            <span className="font-semibold text-brand">{s.byMonth.filter(Boolean).length}</span> เดือน
          </p>
        </div>
      ),
    },
    {
      bg: "bg-brand-soft text-ink",
      body: (
        <div className="w-full max-w-xs text-center">
          <p className="text-sm text-muted">เดือนที่เที่ยวบ่อยที่สุด</p>
          <p className="mt-2 text-4xl font-semibold text-brand">{MONTHS_FULL[s.busiest]}</p>
          <p className="mt-1 text-zinc-600">{s.byMonth[s.busiest]} ที่ในเดือนเดียว</p>
          <div className="mt-8 flex h-32 items-end gap-1">
            {s.byMonth.map((n, m) => (
              <div key={m} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t-md ${m === s.busiest ? "bg-brand" : "bg-brand/25"}`}
                    style={{ height: `${Math.max(4, (n / maxMonth) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] leading-none text-muted">{MONTHS[m]}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      bg: "bg-white text-ink",
      body: (
        <div className="w-full max-w-xs text-center">
          <p className="text-sm text-muted">จังหวัดที่ไปบ่อยที่สุด</p>
          <div className="mt-6 flex flex-col gap-3">
            {s.topProvinces.map(([name, n], k) => (
              <div
                key={name}
                className={`flex items-center justify-between rounded-2xl px-5 py-4 ${k === 0 ? "bg-brand text-white" : "bg-brand-soft"}`}
              >
                <span className={`font-semibold ${k === 0 ? "text-2xl" : "text-lg"}`}>
                  {k + 1}. {name}
                </span>
                <span className={k === 0 ? "text-white/85" : "text-brand"}>{n} ครั้ง</span>
              </div>
            ))}
            {s.topProvinces.length === 0 && <p className="text-muted">—</p>}
          </div>
        </div>
      ),
    },
    {
      bg: "bg-ink text-white",
      body: first && (
        <div className="w-full max-w-xs text-center">
          <p className="text-sm text-white/70">ที่แรกของปี</p>
          {first.photos[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb(first.photos[0], 600)} alt="" className="mx-auto mt-4 aspect-[4/5] w-56 rounded-2xl object-cover" />
          )}
          <p className="mt-4 text-xl font-semibold">{first.name}</p>
          <p className="text-sm text-white/70">{fmt.long(first.visitedOn)}</p>
          {last && last.id !== first.id && (
            <p className="mt-6 text-sm text-white/80">
              ล่าสุด: <span className="font-medium text-white">{last.name}</span> · {fmt.date(last.visitedOn)}
            </p>
          )}
        </div>
      ),
    },
    {
      bg: "bg-white text-ink",
      body: (
        <div className="w-full max-w-xs text-center">
          <p className="text-sm text-muted">ความทรงจำที่เก็บไว้</p>
          <p className="mt-1 text-3xl font-semibold">
            <span className="text-brand">{s.photos}</span> รูป
            {s.videos > 0 && (
              <>
                {" "}· <span className="text-brand">{s.videos}</span> คลิป
              </>
            )}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-1.5">
            {s.collage.map((u, k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={k} src={thumb(u, 240)} alt="" className="aspect-square w-full rounded-lg object-cover" />
            ))}
          </div>
        </div>
      ),
    },
    {
      bg: "bg-brand",
      body: (
        <div className="text-center">
          <HeartIcon width={56} height={56} className="heartbeat mx-auto" />
          <p className="mt-6 text-lg">ปีนี้เราอยู่ด้วยกันมา</p>
          <p className="text-6xl font-semibold tabular-nums">{s.daysTogether.toLocaleString("th-TH")}</p>
          <p className="text-lg">วัน</p>
          <p className="mt-8 text-white/90">ขอบคุณที่ไปด้วยกันทุกที่นะ</p>
          <p className="mt-1 text-sm text-white/70">ปีหน้าไปไหนกันต่อดี</p>
        </div>
      ),
    },
  ];
  const n = slides.length;

  // auto-advance (stops on the last slide)
  useEffect(() => {
    if (paused || i >= n - 1) return;
    const t = setTimeout(() => setI((v) => v + 1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [i, paused, n]);

  // Back gesture / Esc closes; arrows navigate
  useEffect(() => {
    window.history.pushState({ ...window.history.state, raopaiReview: true }, "");
    const onPop = () => onCloseRef.current();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") window.history.back();
      if (e.key === "ArrowRight") setI((v) => Math.min(n - 1, v + 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, [n]);

  const close = () => (window.history.state?.raopaiReview ? window.history.back() : onClose());
  const slide = slides[i];

  return (
    <div className="animate-fade fixed inset-0 z-[2600] bg-black md:grid md:place-items-center md:bg-black/70 md:backdrop-blur-sm">
      <div
        className={`relative flex h-dvh w-full select-none flex-col overflow-hidden transition-colors duration-500 md:h-[min(780px,92dvh)] md:w-[420px] md:rounded-3xl ${slide.bg} ${slide.bg.includes("text-") ? "" : "text-white"}`}
        onPointerDown={() => setPaused(true)}
        onPointerUp={(e) => {
          setPaused(false);
          const r = e.currentTarget.getBoundingClientRect();
          if ((e.target as HTMLElement).closest("button")) return;
          setI((v) => (e.clientX - r.left < r.width / 3 ? Math.max(0, v - 1) : Math.min(n - 1, v + 1)));
        }}
        onPointerLeave={() => setPaused(false)}
      >
        {/* progress */}
        <div className="safe-top flex gap-1 px-3">
          {slides.map((_, k) => (
            <div key={k} className="h-0.5 flex-1 overflow-hidden rounded-full bg-current/20">
              <div
                key={`${k}-${i}`}
                className={`h-full rounded-full bg-current ${k === i ? "story-progress" : ""}`}
                style={{
                  width: k < i ? "100%" : k === i ? undefined : "0%",
                  animationDuration: `${SLIDE_MS}ms`,
                  animationPlayState: paused ? "paused" : "running",
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-4 pt-3 text-xs opacity-80">
          <span>สรุปปี {beYear}</span>
          <button onClick={close} aria-label="ปิด" className="grid size-8 place-items-center rounded-full hover:bg-current/10">
            <CloseIcon width={18} height={18} />
          </button>
        </div>
        <div key={i} className="animate-pop flex flex-1 items-center justify-center px-8 pb-16">
          {slide.body}
        </div>
      </div>
    </div>
  );
}
