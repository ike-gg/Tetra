import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

const SIZES = {
  lg: "text-lg",
  md: "text-base",
  sm: "text-sm",
  xs: "text-xs",
};

const TONES = {
  default: "text-foreground",
  muted: "text-muted",
};

type TextProps = ComponentProps<"p"> & {
  size?: keyof typeof SIZES;
  tone?: keyof typeof TONES;
};

export function Text({ size = "md", tone = "default", className, ...props }: TextProps) {
  return <p className={cn(SIZES[size], TONES[tone], className)} {...props} />;
}
