import { memo } from "react";

import { useEmoteMenu } from "@/components/emote/emote-menu";
import { MenuContextTrigger } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import type { Fitting, PanelEmote } from "@/lib/emote";

const FIT: Record<Fitting, string> = {
  contain: "object-contain",
  cover: "object-cover",
  fill: "object-fill",
};

type EmoteProps = {
  emote: PanelEmote;
  /** The name under the preview; off where the name is written next to it. */
  showName?: boolean;
  /** Something is running on it (restoring): dimmed, not interactive. */
  pending?: boolean;
  className?: string;
  /** Set by a list that manages the tab stop (roving focus). */
  tabIndex?: number;
  onClick?: () => void;
  onFocus?: () => void;
  "data-emote-index"?: number;
};

/**
 * The one way to show an emote in the panel: a square preview that selects on click and
 * opens the list's emote menu on right click, long press, Shift+F10 or the context menu
 * key. Must sit inside `<EmoteMenu>`, which decides the actions.
 */
export const Emote = memo(function Emote({
  emote,
  showName = true,
  pending = false,
  className,
  onClick,
  onFocus,
  ...props
}: EmoteProps) {
  const { controller, fittingOf, selectedKey, activate, triggerRef } = useEmoteMenu();
  const fitting = fittingOf(emote);
  const selected = selectedKey === emote.key;
  const unavailable = emote.available === false;

  return (
    <MenuContextTrigger
      controller={controller}
      payload={emote}
      disabled={pending}
      render={<button type="button" />}
      aria-label={showName ? undefined : emote.name}
      aria-pressed={selected}
      aria-busy={pending || undefined}
      data-selected={selected || undefined}
      onClick={() => {
        onClick?.();
        if (!pending) activate(emote);
      }}
      onFocus={(event) => {
        triggerRef.current = event.currentTarget;
        onFocus?.();
      }}
      onContextMenu={(event) => {
        triggerRef.current = event.currentTarget;
      }}
      // Browsers turn Shift+F10 into a contextmenu event only on some platforms (not
      // macOS), so open it here everywhere; preventing the key stops a second open
      onKeyDown={(event) => {
        if (event.key !== "F10" || !event.shiftKey || pending) return;
        event.preventDefault();
        triggerRef.current = event.currentTarget;
        void controller.open({
          payload: emote,
          anchor: event.currentTarget,
          focus: "first",
        });
      }}
      className={cn(
        "group/emote relative flex min-w-0 cursor-default select-none flex-col items-stretch gap-1 border-0 bg-transparent p-1 text-left [-webkit-touch-callout:none]",
        "hover:bg-surface active:bg-neutral-800 data-selected:bg-surface",
        "focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:-outline-offset-2",
        "data-selected:outline-2 data-selected:outline-primary data-selected:-outline-offset-2",
        pending && "cursor-wait",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "relative block aspect-square w-full overflow-hidden bg-checker",
          (pending || unavailable) && "opacity-40"
        )}
      >
        <img
          src={emote.previewUrl}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn("size-full", FIT[fitting])}
        />
        {fitting !== "contain" && (
          <span className="absolute top-0 right-0 bg-background/85 px-1 font-mono text-[0.625rem] text-primary leading-4">
            {fitting}
          </span>
        )}
        {(emote.managed || unavailable) && (
          <span className="absolute bottom-0 left-0 bg-background/85 px-1 font-mono text-[0.625rem] text-muted leading-4">
            {unavailable ? "unavailable" : "managed"}
          </span>
        )}
      </span>
      {pending && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}
      {showName && (
        <span className="block truncate px-0.5 text-muted text-xs group-hover/emote:text-foreground group-data-selected/emote:text-foreground">
          {emote.name}
        </span>
      )}
    </MenuContextTrigger>
  );
});
