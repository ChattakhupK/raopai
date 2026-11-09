"use client";
import { useCallback, useEffect, useState } from "react";
import { api, fmt, todayYMD } from "@/lib/client";
import type { MatchDay, MatchRound, MatchStats } from "@/lib/types";
import { readMe, WhoPicker, type Who } from "./DailyQuestion";
import { HeartIcon, Spinner } from "./icons";

const PER_DAY = 5;

/** In development, `?matchday=YYYY-MM-DD` previews another day's round. */
function pickDay() {
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    const d = new URLSearchParams(window.location.search).get("matchday");
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  return todayYMD();
}

const opt = (r: MatchRound, c: 0 | 1 | null) => (c === null ? null : r.options[c]);

/** One answered question as a compact row: question, both picks, and match mark. */
function RoundRow({ r }: { r: MatchRound }) {
  return (
    <li className="flex items-start gap-2.5 rounded-2xl bg-zinc-50 px-3.5 py-2.5">
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold ${
          r.matched === true
            ? "bg-brand text-white"
            : r.matched === false
              ? "bg-zinc-200 text-zinc-500"
              : "bg-white text-zinc-400 ring-1 ring-line"
        }`}
      >
        {r.matched === true ? <HeartIcon width={10} height={10} /> : r.matched === false ? "✕" : r.slot + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-snug">{r.question}</p>
        <p className="mt-0.5 text-[11px] text-muted">
          <span className="text-brand">คุณ</span> {opt(r, r.mine) ?? "—"}
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="text-brand">แฟน</span>{" "}
          {r.theirs !== null ? opt(r, r.theirs) : r.theirsAnswered ? "🤫" : "รอเลือก…"}
        </p>
      </div>
    </li>
  );
}

/** "ทายใจตรงกัน" — 5 either/or questions a day; once both have picked, see how many matched. */
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

  // poll while waiting for the partner
  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  if (!me) return <WhoPicker onPick={setMe} />;

  const current = data?.rounds.find((r) => r.mine === null) ?? null;
  const answered = data?.rounds.filter((r) => r.mine !== null) ?? [];
  const finished = !!data && data.myDone === PER_DAY;
  const allRevealed = !!data && data.played === PER_DAY;

  async function choose(c: 0 | 1) {
    if (!me || !current || picking !== null) return;
    setPicking(c);
    try {
      const d = await api.pickMatch(day, me, current.slot, c);
      setData(d);
      if (d.myDone === PER_DAY) onPlayed?.();
      api.matchStats(day, me).then(setStats).catch(() => {});
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPicking(null);
    }
  }

  const pct = stats && stats.played ? Math.round((stats.matched / stats.played) * 100) : 0;

  return (
    <div className="flex flex-col gap-3 pb-2">
      {/* question card — the inverted twin of คำถามวันนี้ */}
      <div className="relative overflow-hidden rounded-2xl bg-brand-soft px-4 pb-4 pt-3 text-brand ring-1 ring-brand/15">
        <span className="absolute right-3 top-3 flex">
          <HeartIcon width={18} height={18} />
          <HeartIcon width={18} height={18} className="-ml-1.5 text-brand/40" />
        </span>
        <p className="text-[11px] text-brand/70">ทายใจวันนี้ · {fmt.date(day)}</p>

        {!data && !error && (
          <div className="grid place-items-center py-4">
            <Spinner />
          </div>
        )}

        {data && current && (
          <>
            <p key={current.slot} className="animate-fade mt-1 pr-10 text-[15px] font-medium leading-snug text-ink">
              {current.question}
            </p>
            <p className="mt-0.5 text-[11px] text-brand/70">
              ข้อ {current.slot + 1} จาก {PER_DAY} · เลือกให้ตรงใจกันนะ
            </p>
          </>
        )}

        {data && finished && (
          <>
            <p className="mt-1 text-[15px] font-medium leading-snug text-ink">
              {allRevealed ? (
                <>
                  ใจตรงกัน <span className="text-brand">{data.matched}</span> จาก {PER_DAY} ข้อ
                </>
              ) : (
                "ตอบครบ 5 ข้อแล้ว"
              )}
            </p>
            <p className="mt-0.5 text-[11px] text-brand/70">
              {allRevealed
                ? data.matched === PER_DAY
                  ? "รู้ใจกันทุกข้อเลย ♥"
                  : data.matched >= 3
                    ? "รู้ใจกันดีมาก"
                    : "พรุ่งนี้มาลองใหม่นะ"
                : `รอแฟนตอบอยู่ (${data.theirsDone}/${PER_DAY})`}
            </p>
          </>
        )}

        {/* progress */}
        {data && (
          <div className="mt-3 flex gap-1">
            {data.rounds.map((r) => (
              <span
                key={r.slot}
                className={`h-1 flex-1 rounded-full ${
                  r.matched === true
                    ? "bg-brand"
                    : r.matched === false
                      ? "bg-brand/30"
                      : r.mine !== null
                        ? "bg-brand/60"
                        : r.slot === current?.slot
                          ? "bg-brand/25"
                          : "bg-white"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* choices for the current question */}
      {data && current && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {current.options.map((label, k) => (
              <button
                key={`${current.slot}-${k}`}
                disabled={picking !== null}
                onClick={() => choose(k as 0 | 1)}
                className="flex min-h-14 items-center justify-center rounded-xl border border-brand/20 bg-white px-3 py-2.5 text-center text-sm transition hover:border-brand hover:bg-brand-soft active:scale-[0.98] disabled:opacity-60"
              >
                {picking === k ? <Spinner className="size-4 text-brand" /> : label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted">
            {current.theirsAnswered ? "แฟนตอบข้อนี้แล้ว 🤫 เลือกก่อนถึงจะเห็นนะ" : "เลือกแล้วเปลี่ยนไม่ได้นะ"}
          </p>
        </div>
      )}

      {/* answered so far */}
      {answered.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {answered.map((r) => (
            <RoundRow key={r.slot} r={r} />
          ))}
        </ul>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-brand-dark">{error}</p>}

      {stats && stats.played > 0 && (
        <p className="text-center text-[11px] text-muted">
          ใจตรงกันแล้ว <span className="font-medium text-brand">{stats.matched}</span> จาก {stats.played} ข้อ ({pct}%)
          {stats.perfectDays > 0 && ` · ตรงครบ 5 ข้อ ${stats.perfectDays} วัน`}
          {stats.streak > 1 && ` · 🔥 เล่นติดกัน ${stats.streak} วัน`}
        </p>
      )}

      {stats && stats.history.length > 0 && (
        <>
          <button onClick={() => setShowPast((v) => !v)} className="mt-1 self-center text-xs font-medium text-muted hover:text-brand">
            {showPast ? "ซ่อนวันที่ผ่านมา" : "ดูวันที่ผ่านมา"}
          </button>
          {showPast && (
            <div className="flex flex-col gap-3">
              {stats.history.map((d) => (
                <div key={d.day} className="rounded-2xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted">{fmt.date(d.day)}</p>
                    <span className="text-[11px] font-medium text-brand">
                      ♥ ตรงกัน {d.matched}/{d.played}
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {d.rounds
                      .filter((r) => r.matched !== null)
                      .map((r) => (
                        <RoundRow key={r.slot} r={r} />
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
