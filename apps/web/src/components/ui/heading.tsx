import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

const SIZES = {
  display: "text-5xl leading-[1.05] sm:text-7xl",
  xl: "text-4xl sm:text-5xl",
  lg: "text-2xl sm:text-3xl",
  md: "text-xl",
  sm: "text-lg font-medium",
};

const DEFAULT_SIZES = {
  1: "display",
  2: "xl",
  3: "md",
  4: "sm",
  5: "sm",
  6: "sm",
} as const;

type HeadingProps = ComponentProps<"h1"> & {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  // Visual size, independent of the level so the document outline stays correct
  size?: keyof typeof SIZES;
};

export function Heading({ level, size, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as const;

  return (
    <Tag
      className={cn(
        "text-balance font-semibold text-foreground tracking-tight",
        SIZES[size ?? DEFAULT_SIZES[level]],
        className
      )}
      {...props}
    />
  );
}
