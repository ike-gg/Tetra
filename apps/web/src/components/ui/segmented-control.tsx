import {
  SegmentedControlIndicator,
  SegmentedControlItem as SegmentedControlItemPrimitive,
  SegmentedControl as SegmentedControlPrimitive,
} from "@ui-sdk/react/segmented-control";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

type SegmentedControlProps = Omit<
  ComponentProps<typeof SegmentedControlPrimitive>,
  "className"
> & { className?: string; children: ReactNode };

// The indicator jumps without a transition on purpose: control feedback is instant
export function SegmentedControl({
  className,
  children,
  ...props
}: SegmentedControlProps) {
  return (
    <SegmentedControlPrimitive
      className={cn(
        "relative isolate inline-flex select-none gap-0.5 border border-border bg-neutral-900 p-0.5",
        className
      )}
      {...props}
    >
      <SegmentedControlIndicator className="absolute top-(--segmented-control-indicator-top) left-(--segmented-control-indicator-left) -z-10 h-(--segmented-control-indicator-height) w-(--segmented-control-indicator-width) border border-neutral-700 bg-neutral-800" />
      {children}
    </SegmentedControlPrimitive>
  );
}

type SegmentedControlItemProps = Omit<
  ComponentProps<typeof SegmentedControlItemPrimitive>,
  "className"
> & { className?: string };

export function SegmentedControlItem({ className, ...props }: SegmentedControlItemProps) {
  return (
    <SegmentedControlItemPrimitive
      className={cn(
        "relative z-1 inline-flex h-7 flex-1 cursor-default items-center justify-center whitespace-nowrap border-0 bg-transparent px-3 font-medium text-muted text-sm",
        "hover:text-foreground data-checked:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:-outline-offset-2",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
