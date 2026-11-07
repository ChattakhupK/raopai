"use client";
import { createContext, useContext, useEffect, useRef } from "react";

const KEY = "raopaiModal";

/** Drop the history entry a modal pushed, when it is closed by code rather than by Back. */
export function releaseModalHistory() {
  if (typeof window !== "undefined" && window.history.state?.[KEY]) window.history.back();
}

const CloseContext = createContext<() => void>(() => {});
/** Close the surrounding modal the same way the backdrop does (keeps history in sync). */
export const useModalClose = () => useContext(CloseContext);

/**
 * Bottom sheet on phones, centered dialog on larger screens.
 * Pushes a history entry so the Android / PWA back gesture closes the modal instead of leaving the app.
 */
export function Modal({ onClose, label, children }: { onClose: () => void; label: string; children: React.ReactNode }) {
  const onCloseRef = useRef(onClose);
  const pushed = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!pushed.current) {
      window.history.pushState({ ...window.history.state, [KEY]: true }, "");
      pushed.current = true;
    }
    const onPop = () => onCloseRef.current();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("[data-lightbox]")) return;
      if (window.history.state?.[KEY]) window.history.back();
      else onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const requestClose = () => {
    if (window.history.state?.[KEY]) window.history.back(); // popstate → onClose
    else onCloseRef.current();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="fixed inset-0 z-[2500] flex items-end justify-center md:items-center md:p-6">
      <div className="animate-fade absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={requestClose} />
      <div className="animate-sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-[28px] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.15)] md:max-h-[85dvh] md:max-w-lg md:rounded-3xl md:shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
        <button aria-label="ปิด" onClick={requestClose} className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-zinc-200 md:hidden" />
        <div className="safe-bottom min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 md:pb-6 md:pt-5">
          <CloseContext.Provider value={requestClose}>{children}</CloseContext.Provider>
        </div>
      </div>
    </div>
  );
}
