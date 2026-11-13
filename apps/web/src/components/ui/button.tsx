import { Button as ButtonPrimitive } from "@ui-sdk/react/button";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

const VARIANTS = {
  primary:
    "border-primary bg-primary text-primary-foreground not-data-disabled:hover:border-primary-hover not-data-disabled:hover:bg-primary-hover not-data-disabled:active:border-brand-600 not-data-disabled:active:bg-brand-600",
  secondary:
    "border-border bg-background/60 text-foreground backdrop-blur-sm not-data-disabled:hover:border-neutral-600 not-data-disabled:hover:bg-surface not-data-disabled:active:bg-neutral-800",
  ghost:
    "border-transparent bg-transparent text-muted not-data-disabled:hover:bg-surface not-data-disabled:hover:text-foreground not-data-disabled:active:bg-neutral-800",
};

const SIZES = {
  sm: "h-8 gap-1.5 px-3 text-sm",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-12 gap-2 px-6 text-base",
};

type ButtonProps = Omit<ComponentProps<typeof ButtonPrimitive>, "className"> & {
  className?: string;
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  // The orange glow is reserved for the page's main call to action
  glow?: boolean;
};

export function Button({
  variant = "secondary",
  size = "md",
  glow = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <ButtonPrimitive
      className={cn(
        // Native feel: no transitions, default cursor (also on links), instant press state
        "group/button inline-flex cursor-default select-none items-center justify-center whitespace-nowrap border font-medium",
        "focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:outline-offset-2",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-pending:cursor-wait",
        VARIANTS[variant],
        SIZES[size],
        glow && "shadow-[0_0_18px_-4px_var(--color-brand-500)]",
        className
      )}
      {...props}
    />
  );
}
