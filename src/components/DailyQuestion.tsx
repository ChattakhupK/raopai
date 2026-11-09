"use client";
import { useCallback, useEffect, useState } from "react";
import { api, fmt, todayYMD } from "@/lib/client";
import { PARTNERS } from "@/lib/config";
import type { DailyDay } from "@/lib/types";
import { EditIcon, HeartIcon, Spinner } from "./icons";

export type Who = "a" | "b";
const ME_KEY = "raopai_me";

export function readMe(): Who | null {
  try {
    const v = localStorage.getItem(ME_KEY);
    return v === "a" || v === "b" ? v : null;
  } catch {
    return null;
  }
}

function Bubble({ who, text, pending }: { who: string; text: string | null; pending?: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 px-3.5 py-2.5">
      <p className="text-[11px] font-medium text-brand">{who}</p>
      {text ? (
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed">{text}</p>
      ) : (
        <p className="mt-0.5 text-sm text-zinc-400">{pending}</p>
      )}
    </div>
  );
}

/** Today's shared question. Each person answers privately; answers unlock once you've answered. */
export function DailyQuestion({ onAnswered }: { onAnswered?: () => void }) {
  const [me, setMe] = useState<Who | null>(() => (typeof window === "undefined" ? null : readMe()));
  const [today] = useState(() => todayYMD());
  const [data, setData] = useState<DailyDay | null>(null);
  const [past, setPast] = useState<DailyDay[] | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!me) return;
    api
      .daily(today, me)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError((e as Error).message));
  }, [me, today]);

  // load now, then keep checking for the partner's answer while this is open
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!me || !showPast || past) return;
    api.dailyHistory(today, me).then(setPast).catch(() => setPast([]));
  }, [me, showPast, past, today]);

  if (!me) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
          <HeartIcon width={20} height={20} />
        </span>
        <div>
          <p className="font-medium">เครื่องนี้เป็นของใคร</p>
          <p className="mt-0.5 text-xs text-muted">เลือกครั้งเดียว ใช้แยกคำตอบของแต่ละคน</p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2">
          {(["a", "b"] as const).map((w) => (
            <button
              key={w}
              onClick={() => {
                try {
                  localStorage.setItem(ME_KEY, w);
                } catch {}
                setMe(w);
              }}
              className="h-11 rounded-xl bg-brand-soft text-sm font-medium text-brand transition hover:bg-brand hover:text-white"
            >
              {PARTNERS[w]}
            </button>
          ))}
        </div>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !me) return;
    setSaving(true);
    setError(null);
    try {
      const d = await api.answerDaily(today, me, text.trim());
      setData(d);
      setEditing(false);
      onAnswered?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const partner = "แฟน";

  return (
    <div className="flex flex-col gap-3 pb-2">
      <div className="relative overflow-hidden rounded-2xl bg-brand px-4 pb-4 pt-3 text-white">
        <HeartIcon width={56} height={56} className="absolute -right-3 -top-3 text-white/10" />
        <p className="text-[11px] text-white/80">คำถามวันนี้ · {fmt.date(today)}</p>
        <p className="mt-1 text-[15px] font-medium leading-snug">{data?.question ?? "…"}</p>
      </div>

      {!data && !error && (
        <div className="grid place-items-center py-6 text-brand">
          <Spinner />
        </div>
      )}

      {data && (!data.mine || editing) && (
        <form onSubmit={submit} className="flex flex-col gap-2">
          <textarea
            autoFocus
            rows={3}
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="คำตอบของคุณ…"
            className="resize-none rounded-xl border border-line bg-zinc-50 px-3 py-2.5 text-sm outline-none transition focus:border-brand/40 focus:bg-white"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-muted">
              {data.theirsAnswered ? "แฟนตอบแล้ว 🤫 ตอบก่อนถึงจะเห็นนะ" : "ตอบแล้วจะเห็นคำตอบของแฟน"}
            </p>
            <div className="flex shrink-0 gap-1.5">
              {editing && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="h-9 rounded-lg px-3 text-sm text-muted hover:bg-zinc-100"
                >
                  ยกเลิก
                </button>
              )}
              <button
                type="submit"
                disabled={saving || !text.trim()}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
              >
                {saving && <Spinner className="size-4" />} {editing ? "บันทึก" : "ส่งคำตอบ"}
              </button>
            </div>
          </div>
        </form>
      )}

      {data?.mine && !editing && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Bubble who="คุณ" text={data.mine} />
            <button
              aria-label="แก้คำตอบ"
              onClick={() => {
                setText(data.mine ?? "");
                setEditing(true);
              }}
              className="absolute right-2 top-2 grid size-7 place-items-center rounded-full text-zinc-400 hover:bg-white hover:text-brand"
            >
              <EditIcon width={14} height={14} />
            </button>
          </div>
          <Bubble who={partner} text={data.theirs} pending="ยังไม่ได้ตอบ… รอแป๊บนะ" />
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-brand-dark">{error}</p>}

      <button
        onClick={() => setShowPast((v) => !v)}
        className="mt-1 self-center text-xs font-medium text-muted hover:text-brand"
      >
        {showPast ? "ซ่อนคำถามที่ผ่านมา" : "ดูคำถามที่ผ่านมา"}
      </button>

      {showPast && (
        <div className="flex flex-col gap-3">
          {!past && (
            <div className="grid place-items-center py-3 text-brand">
              <Spinner />
            </div>
          )}
          {past?.length === 0 && <p className="text-center text-xs text-muted">ยังไม่มีคำตอบเก่า</p>}
          {past?.map((d) => (
            <div key={d.day} className="rounded-2xl border border-line p-3">
              <p className="text-[11px] text-muted">{fmt.date(d.day)}</p>
              <p className="mt-0.5 text-sm font-medium">{d.question}</p>
              <div className="mt-2 flex flex-col gap-1.5">
                <Bubble who="คุณ" text={d.mine} />
                <Bubble who={partner} text={d.theirs} pending="ไม่ได้ตอบ" />
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => {
          try {
            localStorage.removeItem(ME_KEY);
          } catch {}
          setMe(null);
          setData(null);
          setPast(null);
        }}
        className="self-center text-[10px] text-zinc-400 hover:text-brand"
      >
        เครื่องนี้เป็นของ {PARTNERS[me]} · เปลี่ยน
      </button>
    </div>
  );
}
