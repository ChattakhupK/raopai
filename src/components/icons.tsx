import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const SearchIcon = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const ListIcon = (p: P) => (
  <svg {...base(p)}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
);
export const LocateIcon = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg>
);
export const CalendarIcon = (p: P) => (
  <svg {...base(p)}><rect x="3" y="4.5" width="18" height="17" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
);
export const PinIcon = (p: P) => (
  <svg {...base(p)}><path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
export const CameraIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></svg>
);
export const EditIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" /></svg>
);
export const TrashIcon = (p: P) => (
  <svg {...base(p)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const NavigateIcon = (p: P) => (
  <svg {...base(p)}><path d="M3 11 21 3l-8 18-2-8-8-2z" /></svg>
);
export const ChevronLeftIcon = (p: P) => (
  <svg {...base(p)}><path d="m15 18-6-6 6-6" /></svg>
);
export const HeartIcon = (p: P) => (
  <svg {...base({ fill: "currentColor", stroke: "none", ...p })}>
    <path d="M12 20.5s-8-4.9-8-10.6C4 7.2 6.1 5 8.7 5c1.4 0 2.6.7 3.3 1.8C12.7 5.7 13.9 5 15.3 5 17.9 5 20 7.2 20 9.9c0 5.7-8 10.6-8 10.6z" />
  </svg>
);
export const Spinner = ({ className = "" }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
export const PlayIcon = (p: P) => (
  <svg {...base({ fill: "currentColor", stroke: "none", ...p })}>
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
  </svg>
);
export const NoteIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 12.5c0 4-3.6 7-8 7-1.1 0-2.2-.2-3.1-.5L4.5 20.5l1.2-3.6C4.6 15.6 4 14.1 4 12.5c0-4 3.6-7 8-7s8 3 8 7z" />
    <path d="M12 15s-2.6-1.6-2.6-3.3c0-.8.6-1.4 1.4-1.4.5 0 .9.2 1.2.6.3-.4.7-.6 1.2-.6.8 0 1.4.6 1.4 1.4C14.6 13.4 12 15 12 15z" fill="currentColor" stroke="none" />
  </svg>
);
export const LockIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const ChevronRightIcon = (p: P) => (
  <svg {...base(p)}><path d="m9 18 6-6-6-6" /></svg>
);
