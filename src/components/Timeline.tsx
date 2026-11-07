"use client";
import { fmt } from "@/lib/client";
import type { Place } from "@/lib/types";
import { HeartIcon, PlayIcon } from "./icons";
import { isVideo, thumb } from "@/lib/photos";

type Props = {
  places: Place[];
  years: string[];
  year: string | null;
  onYear: (y: string | null) => void;
  activeId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
};

export function Timeline({ places, years, year, onYear, activeId, onSelect, loading }: Props) {
  const groups: { key: string; label: string; items: Place[] }[] = [];
  for (const p of places) {
    const key = p.visitedOn.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(p);
    else groups.push({ key, label: fmt.month(p.visitedOn), items: [p] });
  }

  return (
    <div className="flex flex-col gap-3">
      {years.length > 1 && (
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
          {[null, ...years].map((y) => (
            <button
              key={y ?? "all"}
              onClick={() => onYear(y)}
              className={`h-7 shrink-0 rounded-full px-3 text-xs font-medium transition ${
                year === y ? "bg-brand text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {y ? fmt.year(y) : "ทั้งหมด"}
            </button>
          ))}
        </div>
      )}

      {loading && places.length === 0 && (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-100" />
          ))}
        </div>
      )}

      {!loading && places.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand">
            <HeartIcon width={26} height={26} />
          </span>
          <p className="font-medium">ยังไม่มีหมุดเลย</p>
          <p className="max-w-[240px] text-sm text-muted">ค้นหาสถานที่ด้านบน หรือแตะบนแผนที่ เพื่อปักหมุดที่แรกของเรา</p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.key}>
          <h3 className="sticky top-0 z-10 -mx-1 bg-white/90 px-1 py-1 text-[11px] font-medium text-zinc-400 backdrop-blur">
            {g.label} <span className="font-normal">· {g.items.length} ที่</span>
          </h3>
          <ul className="flex flex-col">
            {g.items.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => onSelect(p.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition ${
                    p.id === activeId ? "bg-brand-soft" : "hover:bg-zinc-50"
                  }`}
                >
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-brand-soft">
                    {p.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb(p.photos[0], 120)} alt="" loading="lazy" className="size-full object-cover" />
                    ) : (
                      <div className="grid size-full place-items-center text-brand">
                        <HeartIcon width={14} height={14} />
                      </div>
                    )}
                    {p.photos.some(isVideo) && (
                      <span className="absolute bottom-0.5 right-0.5 grid size-3.5 place-items-center rounded-full bg-black/55 text-white">
                        <PlayIcon width={7} height={7} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-[11px] text-zinc-400">{p.address || "—"}</p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-brand">{fmt.date(p.visitedOn).replace(/ \d{4}$/, "")}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
