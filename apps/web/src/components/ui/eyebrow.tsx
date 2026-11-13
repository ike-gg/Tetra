import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

type EyebrowProps = ComponentProps<"p"> & {
  // Renders the `[01] /` prefix used for numbered sections
  index?: string;
};

export function Eyebrow({ index, className, children, ...props }: EyebrowProps) {
  return (
    <p
      className={cn("font-mono text-muted text-xs tracking-widest", className)}
      {...props}
    >
      {index && <span className="text-primary">[{index}] / </span>}
      {children}
    </p>
  );
}
