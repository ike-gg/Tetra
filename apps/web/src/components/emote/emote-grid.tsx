import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useLayoutEffect, useRef, useState } from "react";

import { Emote } from "@/components/emote/emote";
import type { PanelEmote } from "@/lib/emote";
import { useElementSize } from "@/lib/use-element-size";

// Phones get smaller tiles so four fit in a row
const minTile = (width: number) => (width < 480 ? 72 : 88);
const GAP = 4;
// Name line under the preview: text-xs line + gap + padding of the tile
const NAME_HEIGHT = 16 + 4 + 8;

type EmoteGridProps = {
  emotes: PanelEmote[];
  /** Accessible name of the list. */
  label: string;
  /** Keys of emotes with something running on them (restoring). */
  pendingKeys?: ReadonlySet<string>;
};

/**
 * A responsive grid of `<Emote>`s that renders only the rows near the viewport. The
 * window is the scroll container (the panel relies on it for scroll restoration), so
 * this uses the window virtualizer with the grid's offset as the scroll margin. One tab
 * stop: arrow keys, Home/End (row) and Ctrl/Cmd+Home/End (list) move between emotes.
 */
export function EmoteGrid({ emotes, label, pendingKeys }: EmoteGridProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const width = useElementSize(listRef)?.width ?? 0;
  const [scrollMargin, setScrollMargin] = useState(0);
  const [active, setActive] = useState(0);
  const focusAfterRender = useRef<number | null>(null);

  const columns = Math.max(1, Math.floor((width + GAP) / (minTile(width) + GAP)));
  const tile = width > 0 ? (width - GAP * (columns - 1)) / columns : minTile(width);
  const rowHeight = tile + NAME_HEIGHT;
  const rows = Math.ceil(emotes.length / columns);
  const activeIndex = Math.min(active, Math.max(emotes.length - 1, 0));

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () =>
      setScrollMargin(list.getBoundingClientRect().top + window.scrollY);
    measure();
    // Anything above the grid (a notice, a wrapping toolbar) moves it down
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, []);

  const virtualizer = useWindowVirtualizer({
    count: rows,
    estimateSize: () => rowHeight + GAP,
    overscan: 3,
    scrollMargin,
  });

  // Every row has the same height, recomputed from the width; the virtualizer caches
  // sizes, so a new height needs a re-measure
  // biome-ignore lint/correctness/useExhaustiveDependencies: rowHeight is the trigger
  useLayoutEffect(() => {
    virtualizer.measure();
  }, [virtualizer, rowHeight]);

  // A removed emote takes its tile, and focus with it: hand focus to whatever is now at
  // the same place. Read during render, before React removes the element.
  const hadFocus =
    typeof document !== "undefined" &&
    Boolean(listRef.current?.contains(document.activeElement));
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const target = focusAfterRender.current;
    if (target !== null) {
      const element = list.querySelector<HTMLElement>(`[data-emote-index="${target}"]`);
      if (element) {
        element.focus();
        focusAfterRender.current = null;
      }
      return;
    }
    if (hadFocus && !list.contains(document.activeElement)) {
      list.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
    }
  });

  const virtualRows = virtualizer.getVirtualItems();
  const firstRendered = (virtualRows[0]?.index ?? 0) * columns;
  const lastRendered = ((virtualRows.at(-1)?.index ?? 0) + 1) * columns - 1;
  // The active emote may be scrolled out and unmounted; the list keeps a tab stop anyway
  const tabStop =
    activeIndex >= firstRendered && activeIndex <= lastRendered
      ? activeIndex
      : firstRendered;

  const moveTo = (index: number) => {
    const next = Math.max(0, Math.min(emotes.length - 1, index));
    setActive(next);
    focusAfterRender.current = next;
    virtualizer.scrollToIndex(Math.floor(next / columns), { align: "auto" });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const from = Number((event.target as HTMLElement).dataset.emoteIndex ?? activeIndex);
    const rowStart = from - (from % columns);
    const modifier = event.ctrlKey || event.metaKey;
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const keys: Record<string, number | undefined> = {
      ArrowRight: from + (rtl ? -1 : 1),
      ArrowLeft: from + (rtl ? 1 : -1),
      ArrowDown: from + columns < emotes.length ? from + columns : undefined,
      ArrowUp: from - columns >= 0 ? from - columns : undefined,
      Home: modifier ? 0 : rowStart,
      End: modifier
        ? emotes.length - 1
        : Math.min(rowStart + columns - 1, emotes.length - 1),
    };
    if (!(event.key in keys) || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const next = keys[event.key];
    if (next !== undefined) moveTo(next);
  };

  return (
    <ul
      ref={listRef}
      aria-label={label}
      onKeyDown={onKeyDown}
      className="relative m-0 w-full list-none p-0"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualRows.flatMap((row) => {
        const start = row.index * columns;
        return emotes.slice(start, start + columns).map((emote, column) => {
          const index = start + column;
          return (
            <li
              key={emote.key}
              aria-setsize={emotes.length}
              aria-posinset={index + 1}
              className="absolute top-0 left-0 flex"
              style={{
                width: tile,
                height: rowHeight,
                transform: `translate(${column * (tile + GAP)}px, ${row.start - scrollMargin}px)`,
              }}
            >
              <Emote
                emote={emote}
                pending={pendingKeys?.has(emote.key)}
                tabIndex={index === tabStop ? 0 : -1}
                data-emote-index={index}
                onClick={() => setActive(index)}
                onFocus={() => setActive(index)}
                className="w-full"
              />
            </li>
          );
        });
      })}
    </ul>
  );
}
