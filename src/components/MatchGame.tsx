"use client";
import { useCallback, useEffect, useState } from "react";
import { api, fmt, todayYMD } from "@/lib/client";
import type { MatchDay, MatchStats } from "@/lib/types";
import { Bubble, readMe, WhoPicker, type Who } from "./DailyQuestion";
import { HeartIcon, Spinner } from "./icons";

/** In development, `?matchday=YYYY-MM-DD` previews another day's round. */
function pickDay() {
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    const d = new URLSearchParams(window.location.search).get("matchday");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  return todayYMD();
}

/** "ทายใจตรงกัน" — pick one of two options; once both have picked, see whether we matched. */
export function MatchGame({ onPlayed }: { onPlayed?: () => void }) {
  const [me, setMe] = useState<Who | null>(() => (typeof window === "undefined" ? null : readMe()));
  const [day] = useState(pickDay);
  const [data, setData] = useState<MatchDay | null>(null);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [picking, setPicking] = useState<0 | 1 | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!me) return;
    api
      .match(day, me)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError((e as Error).message));
    api.matchStats(day, me).then(setStats).catch(() => {});
  }, [me, day]);

  // poll while waiting for the partner's pick
  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  if (!me) return <WhoPicker onPick={setMe} />;

  async function choose(c: 0 | 1) {
    if (!me || !data || data.mine !== null || picking !== null) return;
    setPicking(c);
    try {
      setData(await api.pickMatch(day, me, c));
      onPlayed?.();
      api.matchStats(day, me).then(setStats).catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPicking(null);
    }
  }

  const revealed = data?.matched === true || data?.matched === false;
  const pct = stats && stats.played ? Math.round((stats.matched / stats.played) * 100) : 0;

  const opt = (d: MatchDay, c: 0 | 1 | null) => (c === null ? null : d.options[c]);

  return (
    <div className="flex flex-col gap-3 pb-2">
      {/* same card as คำถามวันนี้, inverted (pink + red text) so the two games read as siblings */}
      <div className="relative overflow-hidden rounded-2xl bg-brand-soft px-4 pb-4 pt-3 text-brand ring-1 ring-brand/15">
        <span className="absolute right-3 top-3 flex">
          <HeartIcon width={18} height={18} />
          <HeartIcon width={18} height={18} className="-ml-1.5 text-brand/40" />
        </span>
        <p className="text-[11px] text-brand/70">ทายใจวันนี้ · {fmt.date(day)}</p>
        <p className="mt-1 pr-10 text-[15px] font-medium leading-snug text-ink">{data?.question ?? "…"}</p>
        <p className="mt-0.5 text-[11px] text-brand/70">เลือกให้ตรงใจกันนะ</p>
      </div>

      {!data && !error && (
        <div className="grid place-items-center py-6 text-brand">
          <Spinner />
        </div>
      )}

      {/* pick */}
      {data && data.mine === null && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {data.options.map((label, k) => (
              <button
                key={k}
                disabled={picking !== null}
                onClick={() => choose(k as 0 | 1)}
                className="flex min-h-14 items-center justify-center rounded-xl border border-brand/20 bg-white px-3 py-2.5 text-center text-sm transition hover:border-brand hover:bg-brand-soft active:scale-[0.98] disabled:opacity-60"
              >
                {picking === k ? <Spinner className="size-4 text-brand" /> : label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted">
            {data.theirsAnswered ? "แฟนเลือกแล้ว 🤫 เลือกก่อนถึงจะเห็นนะ" : "เลือกได้ครั้งเดียว เปลี่ยนไม่ได้นะ"}
          </p>
        </div>
      )}

      {/* picked */}
      {data && data.mine !== null && (
        <div className="flex flex-col gap-2">
          <Bubble who="คุณ" text={opt(data, data.mine)} />
          <Bubble who="แฟน" text={opt(data, data.theirs)} pending="ยังไม่ได้เลือก… รอแป๊บนะ" />
          {revealed && (
            <p
              className={`animate-pop flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-sm font-medium ${
                data.matched ? "bg-brand-soft text-brand" : "bg-zinc-50 text-zinc-500"
              }`}
            >
              {data.matched ? <HeartIcon width={14} height={14} className="heartbeat" /> : "😅"}
              {data.matched ? "ใจตรงกัน" : "ใจไม่ตรงกัน ไว้ลองใหม่พรุ่งนี้นะ"}
            </p>
          )}
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-brand-dark">{error}</p>}

      {stats && stats.played > 0 && (
        <p className="text-center text-[11px] text-muted">
          ใจตรงกันแล้ว <span className="font-medium text-brand">{stats.matched}</span> จาก {stats.played} วัน ({pct}%)
          {stats.streak > 1 && ` · 🔥 ติดกัน ${stats.streak} วัน`}
        </p>
      )}

      {stats && stats.history.length > 0 && (
        <>
          <button onClick={() => setShowPast((v) => !v)} className="mt-1 self-center text-xs font-medium text-muted hover:text-brand">
            {showPast ? "ซ่อนรอบที่ผ่านมา" : "ดูรอบที่ผ่านมา"}
          </button>
          {showPast && (
            <div className="flex flex-col gap-3">
              {stats.history.map((d) => (
                <div key={d.day} className="rounded-2xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted">{fmt.date(d.day)}</p>
                    <span className={`text-[11px] font-medium ${d.matched ? "text-brand" : "text-zinc-400"}`}>
                      {d.matched ? "♥ ใจตรงกัน" : "ไม่ตรงกัน"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm font-medium">{d.question}</p>
                  <div className="mt-2 flex flex-col gap-1.5">
                    <Bubble who="คุณ" text={opt(d, d.mine)} />
                    <Bubble who="แฟน" text={opt(d, d.theirs)} pending="ไม่ได้เลือก" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
