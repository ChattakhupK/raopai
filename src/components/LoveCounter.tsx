"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ANNIVERSARY } from "@/lib/config";
import { fmt, todayYMD } from "@/lib/client";
import { HeartIcon } from "./icons";

const DAY = 86_400_000;
const parse = (ymd: string) => ymd.split("-").map(Number) as [number, number, number];
const utc = ([y, m, d]: [number, number, number]) => Date.UTC(y, m - 1, d);
const toYMD = (t: number) => new Date(t).toISOString().slice(0, 10);

/** Same day-of-month `n` months after start, clamped to month length (e.g. 31 Jan + 1 → 28/29 Feb). */
function addMonths(start: [number, number, number], n: number) {
  const [y, m, d] = start;
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  return Date.UTC(y, m - 1 + n, Math.min(d, last));
}

function compute(today: string) {
  const start = parse(ANNIVERSARY);
  const now = utc(parse(today));
  const days = Math.round((now - utc(start)) / DAY);

  let months = 0;
  while (addMonths(start, months + 1) <= now) months++;
  const restDays = Math.round((now - addMonths(start, months)) / DAY);

  const nextMonth = addMonths(start, months + 1);
  const years = Math.floor(months / 12);
  const nextYear = addMonths(start, (years + 1) * 12);

  const prevMonth = addMonths(start, months);
  const prevYear = addMonths(start, years * 12);
  const milestones = [
    {
      label: `ครบ ${months + 1} เดือน`,
      inDays: Math.round((nextMonth - now) / DAY),
      date: toYMD(nextMonth),
      pct: (now - prevMonth) / (nextMonth - prevMonth),
    },
    {
      label: `ครบรอบ ${years + 1} ปี`,
      inDays: Math.round((nextYear - now) / DAY),
      date: toYMD(nextYear),
      pct: (now - prevYear) / (nextYear - prevYear),
    },
  ]
    .filter((m, i, all) => all.findIndex((x) => x.date === m.date) === i)
    .sort((a, b) => a.inDays - b.inDays);

  let today_: string | null = null;
  if (days > 0 && restDays === 0) today_ = months % 12 === 0 ? `ครบรอบ ${months / 12} ปี` : `ครบ ${months} เดือน`;

  return { days, months, restDays, years, milestones, celebrate: today_ };
}

// Re-read the date every minute so the counter rolls over at midnight; null during SSR.
const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 60_000);
  return () => clearInterval(t);
};

export function LoveCounter({ className = "" }: { className?: string }) {
  const today = useSyncExternalStore(subscribe, todayYMD, () => null);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  if (!today) return null;
  const c = compute(today);
  if (c.days < 0) return null;

  const span =
    c.years > 0
      ? `${c.years} ปี ${c.months % 12} เดือน ${c.restDays} วัน`
      : c.months > 0
        ? `${c.months} เดือน ${c.restDays} วัน`
        : `${c.days} วัน`;

  return (
    <div ref={wrap} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`คบกันมา ${c.days} วัน`}
        className="flex h-10 items-center gap-1 rounded-full bg-brand pl-3 pr-3.5 text-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] transition active:scale-95"
      >
        <HeartIcon width={13} height={13} className="heartbeat" />
        <span className="text-sm font-semibold tabular-nums">{c.days.toLocaleString("th-TH")}</span>
        <span className="text-[11px] text-white/80">วัน</span>
      </button>

      {open && (
        <div className="animate-pop absolute right-0 top-12 w-60 overflow-hidden rounded-3xl bg-white shadow-[0_12px_32px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
          {/* red header with scattered hearts */}
          <div className="relative overflow-hidden bg-brand px-5 pb-5 pt-4 text-center text-white">
            <HeartIcon width={22} height={22} className="absolute left-3 top-3 -rotate-12 text-white/25" />
            <HeartIcon width={14} height={14} className="absolute right-5 top-4 rotate-12 text-white/30" />
            <HeartIcon width={30} height={30} className="absolute -bottom-2 right-2 -rotate-6 text-white/15" />
            <HeartIcon width={12} height={12} className="absolute bottom-4 left-6 rotate-6 text-white/25" />
            <p className="text-xs text-white/85">เราคบกันมา</p>
            <p className="mt-0.5 text-5xl font-semibold tabular-nums tracking-tight">{c.days.toLocaleString("th-TH")}</p>
            <p className="text-sm text-white/90">{c.days >= 30 ? span : "วัน"}</p>
          </div>

          <div className="px-5 pb-4 pt-4">
            {c.celebrate && (
              <p className="mb-3 flex items-center justify-center gap-1.5 rounded-full bg-brand-soft py-1.5 text-sm font-medium text-brand">
                วันนี้{c.celebrate} <HeartIcon width={12} height={12} />
              </p>
            )}
            <div className="flex flex-col gap-3.5">
              {c.milestones.map((m) => (
                <div key={m.label}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{m.label}</span>
                    <span className="text-xs text-brand">อีก {m.inDays} วัน</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-brand-soft">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(4, m.pct * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-[11px] text-muted">ตั้งแต่ {fmt.date(ANNIVERSARY)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
