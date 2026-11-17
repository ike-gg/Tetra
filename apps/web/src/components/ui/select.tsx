import {
  SelectContent as SelectContentPrimitive,
  SelectGroupLabel as SelectGroupLabelPrimitive,
  SelectItem as SelectItemPrimitive,
  SelectTrigger as SelectTriggerPrimitive,
} from "@ui-sdk/react/select";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

export {
  Select,
  SelectGroup,
  SelectItemIcon,
  SelectLabel,
  SelectValue,
  SelectValueIcon,
} from "@ui-sdk/react/select";

type WithClassName<T> = Omit<T, "className"> & { className?: string };
type WithNodeChildren<T> = Omit<WithClassName<T>, "children"> & { children?: ReactNode };

// Looks like TextField's input, so a form reads as one set of fields. Pinned in full:
// web.css sets height, padding and a chevron, and /branding doesn't load it.
export function SelectTrigger({
  className,
  children,
  ...props
}: WithNodeChildren<ComponentProps<typeof SelectTriggerPrimitive>>) {
  return (
    <SelectTriggerPrimitive
      className={cn(
        "m-0 flex h-9 w-full min-w-0 cursor-default select-none items-center gap-2 rounded-none border border-neutral-700 bg-neutral-900 px-2.5 text-left text-foreground text-sm shadow-none outline-none before:hidden after:hidden",
        "hover:border-neutral-600 focus-visible:border-primary data-open:border-primary",
        "data-placeholder:text-neutral-500",
        "data-disabled:cursor-not-allowed data-disabled:border-border data-disabled:bg-transparent data-disabled:text-muted",
        className
      )}
      {...props}
    >
      {children}
      <span
        aria-hidden="true"
        className="ml-auto shrink-0 pl-2 font-mono text-muted text-xs"
      >
        ▾
      </span>
    </SelectTriggerPrimitive>
  );
}

export function SelectContent({
  className,
  ...props
}: WithClassName<ComponentProps<typeof SelectContentPrimitive>>) {
  return (
    <SelectContentPrimitive
      collisionPadding={8}
      sideOffset={4}
      className={cn(
        "m-0 w-(--anchor-width) min-w-52 max-w-[calc(100vw-1rem)] max-h-[min(20rem,var(--available-height))] overflow-y-auto overscroll-contain border border-border bg-background p-1 text-foreground text-sm shadow-none outline-none",
        className
      )}
      {...props}
    />
  );
}

// The chosen row gets the orange square menus use for a checked radio item
export function SelectItem({
  className,
  children,
  ...props
}: WithNodeChildren<ComponentProps<typeof SelectItemPrimitive>>) {
  return (
    <SelectItemPrimitive
      className={cn(
        "group/item relative flex h-8 min-h-0 cursor-default select-none items-center gap-2 py-0 pr-2 pl-7 text-sm outline-none before:hidden after:hidden",
        "data-highlighted:bg-surface data-disabled:cursor-not-allowed data-disabled:text-muted",
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute left-2.5 size-1.5 bg-primary group-not-data-selected/item:hidden"
      />
      {children}
    </SelectItemPrimitive>
  );
}

// Mono like the menus' group labels; names a group of items for screen readers too
export function SelectGroupLabel({
  className,
  ...props
}: WithClassName<ComponentProps<typeof SelectGroupLabelPrimitive>>) {
  return (
    <SelectGroupLabelPrimitive
      className={cn(
        "m-0 select-none px-2.5 pt-2 pb-1 font-mono text-muted text-xs first:pt-1",
        className
      )}
      {...props}
    />
  );
}
