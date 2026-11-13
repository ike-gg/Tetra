import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

// The brand's serif flourish: one or two words inside a heading, never more
export function Accent({ className, ...props }: ComponentProps<"span">) {
  return (
    <span className={cn("font-normal font-serif text-primary", className)} {...props} />
  );
}
