import { useSyncExternalStore } from "react";

import type { PanelEmote } from "@/lib/emote";

/**
 * The panel has one selection at a time, owned by one `EmoteMenu` (one list). It's a list
 * of emotes so Shift/Cmd+click can add to it later; today it holds at most one.
 */
type Selection = { owner: string | null; emotes: readonly PanelEmote[] };

const EMPTY: readonly PanelEmote[] = [];
let selection: Selection = { owner: null, emotes: EMPTY };
const listeners = new Set<() => void>();

const set = (next: Selection) => {
  selection = next;
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const read = () => selection;

export const emoteSelection = {
  /** Makes `emotes` the selection of `owner`'s list, replacing any other list's. */
  replace(owner: string, emotes: readonly PanelEmote[]) {
    set(emotes.length > 0 ? { owner, emotes } : { owner: null, emotes: EMPTY });
  },
  clear(owner: string) {
    if (selection.owner === owner) set({ owner: null, emotes: EMPTY });
  },
  /**
   * Keeps the owner's selection to emotes still in its list and takes their fresh
   * objects, so a removed (or filtered out) emote drops out of the selection.
   */
  sync(owner: string, list: readonly PanelEmote[]) {
    if (selection.owner !== owner) return;
    const byKey = new Map(list.map((emote) => [emote.key, emote]));
    const next = selection.emotes.flatMap((emote) => byKey.get(emote.key) ?? []);
    const changed =
      next.length !== selection.emotes.length ||
      next.some((emote, index) => emote !== selection.emotes[index]);
    if (changed) emoteSelection.replace(owner, next);
  },
};

/** The emotes selected in `owner`'s list (empty when another list has the selection). */
export function useSelectedEmotes(owner: string) {
  const current = useSyncExternalStore(subscribe, read, read);
  return current.owner === owner ? current.emotes : EMPTY;
}
