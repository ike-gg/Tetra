import {
  MenuContent as MenuContentPrimitive,
  MenuGroupLabel as MenuGroupLabelPrimitive,
  MenuItem as MenuItemPrimitive,
  MenuRadioItem as MenuRadioItemPrimitive,
  MenuSeparator as MenuSeparatorPrimitive,
  MenuSubContent as MenuSubContentPrimitive,
  MenuSubTrigger as MenuSubTriggerPrimitive,
} from "@ui-sdk/react/menu";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

export {
  createMenuController,
  Menu,
  MenuContextTrigger,
  MenuGroup,
  MenuRadioGroup,
  MenuSub,
  MenuTrigger,
} from "@ui-sdk/react/menu";

type WithClassName<T> = Omit<T, "className"> & { className?: string };
type WithNodeChildren<T> = Omit<WithClassName<T>, "children"> & { children?: ReactNode };

// Pinned in full so it looks the same with and without ui-sdk's web.css (/branding)
const POPUP =
  "m-0 min-w-52 max-w-[calc(100vw-1rem)] max-h-(--available-height) overflow-y-auto overscroll-contain border border-border bg-background p-1 text-foreground text-sm shadow-none outline-none";

const ROW =
  "relative flex h-8 min-h-0 cursor-default select-none items-center gap-2 px-2 text-sm outline-none data-highlighted:bg-surface data-disabled:cursor-not-allowed data-disabled:opacity-50 data-pending:cursor-wait";

export function MenuContent<Payload = unknown>({
  className,
  ...props
}: WithClassName<ComponentProps<typeof MenuContentPrimitive<Payload>>>) {
  return (
    <MenuContentPrimitive<Payload>
      collisionPadding={8}
      className={cn(POPUP, className)}
      {...props}
    />
  );
}

export function MenuSubContent({
  className,
  ...props
}: WithClassName<ComponentProps<typeof MenuSubContentPrimitive>>) {
  // Content only renders while open, on the client
  const narrow = window.matchMedia("(max-width: 639px)").matches;
  return (
    <MenuSubContentPrimitive
      // Side by side doesn't fit on a phone: the submenu would leave the screen
      side={narrow ? "bottom" : undefined}
      align={narrow ? "end" : undefined}
      collisionPadding={8}
      className={cn(POPUP, className)}
      {...props}
    />
  );
}

const ITEM_VARIANTS = {
  default: "",
  // Destructive actions read in orange, the one loud color; danger is for errors only
  destructive: "text-primary",
  // A read-only line (Info): reachable by keyboard and screen readers, never dimmed
  info: "data-disabled:cursor-default data-disabled:opacity-100 data-highlighted:bg-transparent",
};

type MenuItemProps = WithClassName<ComponentProps<typeof MenuItemPrimitive>> & {
  variant?: keyof typeof ITEM_VARIANTS;
};

export function MenuItem({ className, variant = "default", ...props }: MenuItemProps) {
  return (
    <MenuItemPrimitive
      className={cn(ROW, "no-underline", ITEM_VARIANTS[variant], className)}
      {...props}
      disabled={variant === "info" || props.disabled}
    />
  );
}

export function MenuSubTrigger({
  className,
  children,
  ...props
}: WithNodeChildren<ComponentProps<typeof MenuSubTriggerPrimitive>>) {
  return (
    <MenuSubTriggerPrimitive
      className={cn(ROW, "pr-1 after:hidden data-open:bg-surface", className)}
      {...props}
    >
      {children}
      <span aria-hidden="true" className="ml-auto pl-4 font-mono text-muted text-xs">
        ▸
      </span>
    </MenuSubTriggerPrimitive>
  );
}

export function MenuRadioItem({
  className,
  children,
  ...props
}: WithNodeChildren<ComponentProps<typeof MenuRadioItemPrimitive>>) {
  return (
    <MenuRadioItemPrimitive className={cn(ROW, "group/radio pl-7", className)} {...props}>
      <span
        aria-hidden="true"
        className="absolute left-2.5 size-1.5 bg-primary group-not-data-checked/radio:hidden"
      />
      {children}
    </MenuRadioItemPrimitive>
  );
}

export function MenuGroupLabel({
  className,
  ...props
}: WithClassName<ComponentProps<typeof MenuGroupLabelPrimitive>>) {
  return (
    <MenuGroupLabelPrimitive
      className={cn(
        "select-none px-2 pt-1.5 pb-1 font-mono text-muted text-xs",
        className
      )}
      {...props}
    />
  );
}

export function MenuSeparator({
  className,
  ...props
}: WithClassName<ComponentProps<typeof MenuSeparatorPrimitive>>) {
  return (
    <MenuSeparatorPrimitive
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}
