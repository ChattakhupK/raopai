"use client";
import { useEffect, useRef, useState } from "react";

export type Snap = "peek" | "half" | "full";

// Sheet height as a share of the screen at each snap point.
const SNAPS: Record<Snap, number> = { peek: 0.3, half: 0.58, full: 0.9 };
const ORDER: Snap[] = ["peek", "half", "full"];

function useViewportHeight() {
  const [h, setH] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));
  useEffect(() => {
    const on = () => setH(window.innerHeight);
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return h;
}

type Props = {
  children: React.ReactNode;
  initial?: Snap;
  /** Called when dragged below the lowest snap. Omit to make the sheet non-dismissible by dragging. */
  onDismiss?: () => void;
};

/**
 * Mobile bottom sheet that can be dragged between three heights.
 * Drag the handle (or tap it to step up / back down); content scrolls inside.
 */
export function BottomSheet({ children, initial = "half", onDismiss }: Props) {
  const vh = useViewportHeight();
  const [snap, setSnap] = useState<Snap>(initial);
  const [dragH, setDragH] = useState<number | null>(null);
  const start = useRef<{ y: number; h: number; t: number; moved: boolean } | null>(null);

  const snapH = (s: Snap) => Math.round(SNAPS[s] * vh);
  const height = dragH ?? snapH(snap);

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, h: height, t: performance.now(), moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const s = start.current;
    if (!s) return;
    const dy = s.y - e.clientY;
    if (Math.abs(dy) > 4) s.moved = true;
    if (!s.moved) return;
    setDragH(Math.max(80, Math.min(snapH("full"), s.h + dy)));
  }

  function onPointerUp(e: React.PointerEvent) {
    const s = start.current;
    start.current = null;
    if (!s) return;

    // Tap: step up, or drop back to half from full.
    if (!s.moved) {
      setSnap((cur) => (cur === "full" ? "half" : ORDER[ORDER.indexOf(cur) + 1]));
      return;
    }

    const h = s.h + (s.y - e.clientY);
    const velocity = (s.y - e.clientY) / Math.max(1, performance.now() - s.t); // px/ms, + = up
    setDragH(null);

    if (onDismiss && h < snapH("peek") * 0.6) {
      onDismiss();
      return;
    }
    // Project where a flick would carry the sheet, then snap to the nearest height.
    const projected = h + Math.max(-1.5, Math.min(1.5, velocity)) * 180;
    const nearest = ORDER.reduce((a, b) => (Math.abs(snapH(b) - projected) < Math.abs(snapH(a) - projected) ? b : a));
    setSnap(nearest);
  }

  return (
    <div
      className="animate-sheet absolute inset-x-0 bottom-0 z-[1050] flex flex-col rounded-t-[22px] bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.1)]"
      style={{
        height,
        transition: dragH == null ? "height 0.28s cubic-bezier(0.2, 0.9, 0.3, 1)" : "none",
      }}
    >
      <div
        role="button"
        aria-label="ลากเพื่อปรับขนาด"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          start.current = null;
          setDragH(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") setSnap((c) => ORDER[Math.min(2, ORDER.indexOf(c) + 1)]);
          if (e.key === "ArrowDown") setSnap((c) => ORDER[Math.max(0, ORDER.indexOf(c) - 1)]);
        }}
        className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
      >
        <span className="h-1 w-9 rounded-full bg-zinc-300" />
      </div>
      <div className="safe-bottom min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">{children}</div>
    </div>
  );
}
