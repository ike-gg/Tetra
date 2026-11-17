import { useQuery } from "@tanstack/react-query";
import { Toolbar, ToolbarButton, ToolbarLink } from "@ui-sdk/react/toolbar";
import { useLayoutEffect, useRef } from "react";

import {
  AddToServerItems,
  type EmoteAction,
  EmoteActionItems,
  type EmoteListContext,
  useEmoteActions,
} from "@/components/emote/emote-actions";
import { buttonClassName } from "@/components/ui/button";
import { Menu, MenuContent, MenuTrigger } from "@/components/ui/menu";
import { cn } from "@/lib/cn";
import { type Fitting, type PanelEmote, SOURCE_LABELS } from "@/lib/emote";
import { emoteFileQueryOptions } from "@/lib/emote-file";
import { formatBytes } from "@/lib/format-bytes";
import { useElementSize } from "@/lib/use-element-size";

/** Height of the bar (`h-14`); lists keep scrolled-to items above it. */
export const SELECTION_BAR_HEIGHT = 56;

// Below this every action but the main one moves into More
const WIDE_BAR = 760;
// Below this the main button takes its shortest label, so the name keeps some room
const PHONE_BAR = 480;

type EmoteSelectionBarProps = {
  emote: PanelEmote;
  context: EmoteListContext;
  fitting: Fitting;
  onFittingChange: (fitting: Fitting) => void;
  onClose: () => void;
  /** The bar is closing with focus inside it. */
  onFocusLeave: () => void;
};

/**
 * The selected emote, fixed to the bottom of the content area like a taskbar: preview,
 * name, what's known about the file, and the same actions as the context menu.
 */
export function EmoteSelectionBar({
  emote,
  context,
  fitting,
  onFittingChange,
  onClose,
  onFocusLeave,
}: EmoteSelectionBarProps) {
  const ref = useRef<HTMLElement>(null);
  const width = useElementSize(ref)?.width;
  const actions = useEmoteActions(emote, context, fitting);
  const wide = width !== undefined && width >= WIDE_BAR;
  // Main action first, removing last, away from it
  const buttons = actions
    .filter(({ placement }) => placement === "primary" || (wide && placement === "bar"))
    .sort((a, b) => rank(a) - rank(b));
  const rest = actions.filter((action) => !buttons.includes(action));

  const focusLeave = useRef(onFocusLeave);
  focusLeave.current = onFocusLeave;
  // The bar goes away when its emote does (removed), mid-click: don't drop focus on body
  useLayoutEffect(() => {
    const bar = ref.current;
    return () => {
      if (bar?.contains(document.activeElement)) focusLeave.current();
    };
  }, []);

  return (
    // A labelled <section> is a region landmark
    <section
      ref={ref}
      aria-label="selected emote"
      data-selection-bar=""
      onKeyDown={(event) => {
        // An open menu handles its own Escape
        if (event.key !== "Escape" || event.defaultPrevented) return;
        event.preventDefault();
        onClose();
      }}
      className="fixed right-0 bottom-0 left-[var(--panel-inset,0px)] z-30 h-14 select-none border-border border-t bg-surface px-4 sm:px-8"
    >
      <div className="mx-auto flex h-full w-full max-w-5xl items-center gap-3">
        <span className="block size-10 shrink-0 overflow-hidden bg-checker">
          <img
            src={emote.previewUrl}
            alt=""
            draggable={false}
            className="size-full object-contain"
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="select-text truncate font-medium text-sm">{emote.name}</span>
          <EmoteDetails emote={emote} fitting={fitting} />
        </div>
        {width !== undefined && (
          <Toolbar
            aria-label={`actions for ${emote.name}`}
            // web.css draws the toolbar as a bordered, padded, wrapping box
            className="m-0 flex max-w-none shrink-0 flex-nowrap items-center gap-2 border-0 bg-transparent p-0"
          >
            {buttons.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                emote={emote}
                fitting={fitting}
                phone={width < PHONE_BAR}
              />
            ))}
            <Menu>
              <ToolbarButton
                render={<MenuTrigger />}
                className={buttonClassName({
                  variant: "secondary",
                  size: "sm",
                  className: "data-open:bg-surface",
                })}
              >
                more
                <Caret />
              </ToolbarButton>
              <MenuContent side="top" align="end">
                <EmoteActionItems
                  emote={emote}
                  actions={rest}
                  kind={context.kind}
                  fitting={fitting}
                  onFittingChange={onFittingChange}
                />
              </MenuContent>
            </Menu>
            <ToolbarButton
              aria-label="clear selection"
              onClick={onClose}
              className={buttonClassName({
                variant: "ghost",
                size: "sm",
                className: "w-8 px-0 font-mono text-base",
              })}
            >
              <span aria-hidden="true">×</span>
            </ToolbarButton>
          </Toolbar>
        )}
      </div>
    </section>
  );
}

function Caret() {
  return (
    // Inherits the button's text color, so it reads on the orange one too
    <span aria-hidden="true" className="font-mono text-xs opacity-60">
      ▾
    </span>
  );
}

function EmoteDetails({ emote, fitting }: { emote: PanelEmote; fitting: Fitting }) {
  const file = useQuery(emoteFileQueryOptions(emote.url));
  const dimensions =
    file.data?.dimensions ?? (emote.width && emote.height ? emote : null);
  const size = file.data?.size;
  const parts = [
    SOURCE_LABELS[emote.source],
    emote.animated ? "animated" : "static",
    emote.managed && "managed",
    emote.available === false && "unavailable",
    dimensions && `${dimensions.width}×${dimensions.height}`,
    size && (size < 1024 ? `${size} B` : formatBytes(size)),
  ].filter(Boolean);

  return (
    <span className="truncate font-mono text-muted text-xs tabular-nums">
      {parts.join(" · ")}
      {fitting !== "contain" && <span className="text-primary"> · {fitting}</span>}
    </span>
  );
}

const rank = (action: EmoteAction) =>
  action.placement === "primary" ? 0 : action.variant === "destructive" ? 2 : 1;

const buttonVariant = (action: EmoteAction) =>
  action.variant === "destructive"
    ? "destructive"
    : action.placement === "primary"
      ? "primary"
      : "secondary";

function ActionButton({
  action,
  emote,
  fitting,
  phone,
}: {
  action: EmoteAction;
  emote: PanelEmote;
  fitting: Fitting;
  phone: boolean;
}) {
  const className = buttonClassName({
    variant: buttonVariant(action),
    size: "sm",
    className: "max-w-56 data-open:bg-surface",
  });
  const text = (phone && action.compactLabel) || action.barLabel || action.label;
  const label = <span className="truncate">{text}</span>;
  // A shortened button keeps the full name for screen readers ("remove from Chat Cafe")
  const ariaLabel =
    text === action.label
      ? undefined
      : [action.label, action.hint].filter(Boolean).join(", ");

  switch (action.type) {
    case "run":
      return (
        <ToolbarButton
          aria-label={ariaLabel}
          disabled={action.disabled}
          onClick={action.run}
          className={className}
        >
          {label}
          {action.hint && (
            <span className="font-mono text-muted text-xs">{action.hint}</span>
          )}
        </ToolbarButton>
      );
    case "link":
      return (
        <ToolbarLink aria-label={ariaLabel} render={action.render} className={className}>
          {label}
        </ToolbarLink>
      );
    case "add-to-server":
      return (
        <Menu>
          <ToolbarButton
            aria-label={ariaLabel}
            render={<MenuTrigger />}
            className={cn(
              className,
              // The orange fill stays while its menu is open
              action.placement === "primary" && "data-open:bg-primary"
            )}
          >
            {label}
            <Caret />
          </ToolbarButton>
          <MenuContent side="top" align="start" className="max-w-80">
            <AddToServerItems emote={emote} fitting={fitting} />
          </MenuContent>
        </Menu>
      );
    // Links out and notes live in More
    case "external":
    case "note":
      return null;
  }
}
