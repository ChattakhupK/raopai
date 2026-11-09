"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { NOTE_TTL_MS, type Note } from "@/lib/types";
import { CloseIcon, HeartIcon, NoteIcon, Spinner } from "./icons";
import { DailyQuestion } from "./DailyQuestion";
import { MatchGame } from "./MatchGame";

const expiresAt = (n: Note) => new Date(n.createdAt).getTime() + NOTE_TTL_MS;

// A tiny clock store ticking every second: 0 during prerender, real time in the browser.
let clock = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
const bump = () => {
  clock = Date.now();
  listeners.forEach((l) => l());
};
const subscribeClock = (cb: () => void) => {
  listeners.add(cb);
  timer ??= setInterval(bump, 1000);
  return () => {
    listeners.delete(cb);
    if (!listeners.size) {
      clearInterval(timer);
      timer = undefined;
    }
  };
};
const readClock = () => (clock ||= Date.now());
export const useNow = () => useSyncExternalStore(subscribeClock, readClock, () => 0);

/** Notes younger than 24 h (they quietly disappear after that). */
export const activeNotes = (notes: Note[], now: number) => (now ? notes.filter((n) => expiresAt(n) > now) : []);

/** "12 วินาทีที่แล้ว" / "5 นาทีที่แล้ว" / "3 ชั่วโมงที่แล้ว" */
export function ago(n: Note, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(n.createdAt).getTime()) / 1000));
  if (s < 5) return "เมื่อสักครู่";
  if (s < 60) return `${s} วินาทีที่แล้ว`;
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`;
  return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`;
}

/**
 * One-line note preview floating over the map; tap to open the notes section.
 * With several notes it shows a random one and shuffles to another every few seconds.
 */
export function NoteTicker({ notes, onOpen }: { notes: Note[]; onOpen: () => void }) {
  const now = useNow();
  const active = activeNotes(notes, now);
  const [hidden, setHidden] = useState(false);
  const [pick, setPick] = useState(0); // random in [0, 1); mapped onto the list below
  const count = active.length;

  useEffect(() => {
    if (count < 2) return;
    // first random pick right away (deferred so prerender stays deterministic), then reshuffle
    const first = setTimeout(() => setPick(Math.random()), 0);
    const t = setInterval(() => {
      setPick((prev) => {
        const cur = Math.floor(prev * count);
        let next = cur;
        while (next === cur) next = Math.floor(Math.random() * count); // never repeat the same note
        return (next + 0.5) / count;
      });
    }, 6000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [count]);

  if (!count || hidden) return null;
  const latest = active[Math.min(count - 1, Math.floor(pick * count))];

  return (
    <div className="pointer-events-none absolute inset-x-4 top-[calc(max(env(safe-area-inset-top),12px)+52px)] z-[1080] flex justify-center md:left-[382px] md:right-32 md:top-4">
      <div className="note-float pointer-events-auto max-w-full">
        <div className="animate-pop flex h-9 max-w-full items-center gap-2 rounded-full bg-white pl-1.5 pr-1 shadow-[0_6px_20px_rgba(225,29,46,0.18)] ring-1 ring-brand/10">
          <button onClick={onOpen} className="flex min-w-0 items-center gap-2 text-left">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-white">
              <HeartIcon width={11} height={11} />
            </span>
            <span key={latest.id} className="animate-fade min-w-0 truncate text-[13px] text-ink">
              {latest.text}
            </span>
            {active.length > 1 && (
              <span className="shrink-0 rounded-full bg-brand-soft px-1.5 text-[10px] font-medium tabular-nums text-brand">
                +{active.length - 1}
              </span>
            )}
          </button>
          <button
            aria-label="ซ่อน"
            onClick={() => setHidden(true)}
            className="grid size-7 shrink-0 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100"
          >
            <CloseIcon width={12} height={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export type TalkTab = "notes" | "daily" | "match";

type PanelProps = {
  tab: TalkTab;
  onTab: (t: TalkTab) => void;
  /** today's question / match still unanswered on this device — shows a dot on the tab */
  dailyPending?: boolean;
  onDailyAnswered?: () => void;
  matchPending?: boolean;
  onMatchPlayed?: () => void;
  notes: Note[];
  onPost: (text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
};

/** The notes section: every live note (oldest → newest, like a chat) with a composer underneath. */
export function NotesPanel({
  tab,
  onTab,
  dailyPending,
  onDailyAnswered,
  matchPending,
  onMatchPlayed,
  notes,
  onPost,
  onDelete,
  onClose,
}: PanelProps) {
  const now = useNow();
  const active = activeNotes(notes, now).slice().reverse();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === "notes") endRef.current?.scrollIntoView({ block: "end" });
  }, [active.length, tab]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    setError(null);
    try {
      await onPost(t);
      setText("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 pb-2">
        <div role="tablist" className="flex rounded-full bg-zinc-100 p-0.5 text-sm">
          {(
            [
              ["notes", "ข้อความ"],
              ["daily", "คำถาม"],
              ["match", "ทายใจ"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => onTab(key)}
              className={`relative h-8 rounded-full px-3 font-medium transition ${
                tab === key ? "bg-white text-brand shadow-sm" : "text-zinc-500"
              }`}
            >
              {label}
              {((key === "daily" && dailyPending) || (key === "match" && matchPending)) && tab !== key && (
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-brand" />
              )}
            </button>
          ))}
        </div>
        <button onClick={onClose} aria-label="ปิด" className="grid size-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200">
          <CloseIcon width={16} height={16} />
        </button>
      </div>

      {tab === "daily" ? (
        <div className="no-scrollbar -mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1">
          <DailyQuestion onAnswered={onDailyAnswered} />
        </div>
      ) : tab === "match" ? (
        <div className="no-scrollbar -mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1">
          <MatchGame onPlayed={onMatchPlayed} />
        </div>
      ) : (
      <>
      <div className="no-scrollbar -mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {active.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
              <NoteIcon width={22} height={22} />
            </span>
            <p className="text-sm text-muted">ยังไม่มีข้อความ ฝากอะไรถึงกันหน่อยไหม</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {active.map((n) => (
              <li key={n.id} className="animate-pop group rounded-2xl rounded-bl-md bg-brand-soft px-3.5 pb-2 pt-2.5">
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{n.text}</p>
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                  <span className="tabular-nums text-brand/70">{ago(n, now)}</span>
                  <button
                    onClick={async () => {
                      if (confirmId !== n.id) return setConfirmId(n.id);
                      setDeletingId(n.id);
                      await onDelete(n.id).finally(() => {
                        setDeletingId(null);
                        setConfirmId(null);
                      });
                    }}
                    onBlur={() => setConfirmId((c) => (c === n.id ? null : c))}
                    className={
                      confirmId === n.id
                        ? "font-medium text-brand"
                        : "text-zinc-400 opacity-100 transition hover:text-brand md:opacity-0 md:group-hover:opacity-100"
                    }
                  >
                    {deletingId === n.id ? <Spinner className="size-3" /> : confirmId === n.id ? "ยืนยันลบ" : "ลบ"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="shrink-0 pt-2">
        {error && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-brand-dark">{error}</p>}
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-zinc-50 p-1.5 pl-3 transition focus-within:border-brand/40 focus-within:bg-white">
          <textarea
            rows={1}
            maxLength={300}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="ฝากข้อความถึงกัน… ♥"
            className="max-h-28 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none [field-sizing:content]"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label="ส่ง"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white transition hover:bg-brand-dark disabled:opacity-40"
          >
            {sending ? (
              <Spinner className="size-4" />
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
              </svg>
            )}
          </button>
        </div>
      </form>
      </>
      )}
    </div>
  );
}
