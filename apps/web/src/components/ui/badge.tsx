import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

const TONES = {
  neutral: "border-neutral-700 text-muted",
  primary: "border-primary text-primary",
  // The rare cool accent: a "new" / "experimental" tag, at most one per view
  signal: "border-signal text-signal",
};

type BadgeProps = {
  tone?: keyof typeof TONES;
  children: ReactNode;
  className?: string;
};

// A short mono tag next to a name or heading: outline only, never a fill
export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center border px-1 font-mono font-normal text-[11px] leading-4 tracking-normal",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
