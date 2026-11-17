import {
  TooltipContent as TooltipContentPrimitive,
  Tooltip as TooltipPrimitive,
  TooltipTrigger as TooltipTriggerPrimitive,
} from "@ui-sdk/react/tooltip";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

type WithClassName<T> = Omit<T, "className"> & { className?: string };

// Toggleable, so a tap opens it on touch screens too, and it shows at once, like a
// native control. The root renders no element: the content can sit outside the
// trigger's parent, e.g. after a heading whose accessible name must not include it.
export function Tooltip(props: ComponentProps<typeof TooltipPrimitive>) {
  return <TooltipPrimitive toggleable delay={0} type="description" {...props} />;
}

// A term in running text with a dotted underline that says there's more to it.
// Pinned in full so it looks the same with and without ui-sdk's web.css.
export function TooltipTerm({
  className,
  ...props
}: WithClassName<ComponentProps<typeof TooltipTriggerPrimitive>>) {
  return (
    <TooltipTriggerPrimitive
      className={cn(
        "m-0 inline cursor-default select-text border-0 bg-transparent p-0 font-[inherit] text-inherit tracking-[inherit] underline decoration-2 decoration-muted decoration-dotted underline-offset-[0.18em] outline-none focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
        className
      )}
      {...props}
    />
  );
}

export function TooltipContent({
  className,
  ...props
}: WithClassName<ComponentProps<typeof TooltipContentPrimitive>>) {
  return (
    <TooltipContentPrimitive
      sideOffset={8}
      collisionPadding={8}
      className={cn(
        "m-0 max-w-72 border border-border bg-surface px-3 py-2 font-normal font-sans text-foreground text-sm not-italic leading-snug tracking-normal shadow-none outline-none transition-none",
        className
      )}
      {...props}
    />
  );
}
