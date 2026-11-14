import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

// Braille dots chasing around a cell: every frame has the same width and weight, so
// nothing jumps (the ASCII ramp did)
const FRAMES = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
const FRAME_MS = 120;

export function Spinner({ className }: { className?: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    // Reduced motion: a still glyph; the text next to it still says what's happening
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(
      () => setFrame((current) => (current + 1) % FRAMES.length),
      FRAME_MS
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block w-[1em] select-none text-center font-mono text-primary",
        className
      )}
    >
      {FRAMES[frame]}
    </span>
  );
}
