import {
  SegmentedControlIndicator,
  SegmentedControlItem as SegmentedControlItemPrimitive,
  SegmentedControl as SegmentedControlPrimitive,
} from "@ui-sdk/react/segmented-control";
import { type ComponentProps, createContext, type ReactNode, useContext } from "react";

import { cn } from "@/lib/cn";

// "sm" fits a 36 px title bar or a pane's caption row
type SegmentedControlSize = "sm" | "md";

const SizeContext = createContext<SegmentedControlSize>("md");

const ITEM_SIZES: Record<SegmentedControlSize, string> = {
  sm: "h-5 px-2 text-xs",
  md: "h-7 px-3 text-sm",
};

type SegmentedControlProps = Omit<
  ComponentProps<typeof SegmentedControlPrimitive>,
  "className"
> & { className?: string; size?: SegmentedControlSize; children: ReactNode };

// The indicator jumps without a transition on purpose: control feedback is instant
export function SegmentedControl({
  className,
  size = "md",
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
      <SizeContext value={size}>{children}</SizeContext>
    </SegmentedControlPrimitive>
  );
}

type SegmentedControlItemProps = Omit<
  ComponentProps<typeof SegmentedControlItemPrimitive>,
  "className"
> & { className?: string };

export function SegmentedControlItem({ className, ...props }: SegmentedControlItemProps) {
  const size = useContext(SizeContext);
  return (
    <SegmentedControlItemPrimitive
      className={cn(
        "relative z-1 inline-flex flex-1 cursor-default items-center justify-center whitespace-nowrap border-0 bg-transparent font-medium text-muted",
        ITEM_SIZES[size],
        "hover:text-foreground data-checked:text-foreground",
        "focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:-outline-offset-2",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
