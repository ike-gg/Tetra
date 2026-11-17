import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  EmoteActionItems,
  type EmoteListContext,
  useEmoteActions,
} from "@/components/emote/emote-actions";
import { emoteSelection, useSelectedEmotes } from "@/components/emote/emote-selection";
import { EmoteSelectionBar } from "@/components/emote/emote-selection-bar";
import {
  createMenuController,
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
} from "@/components/ui/menu";
import type { Fitting, PanelEmote } from "@/lib/emote";

export {
  type EmoteListContext,
  type EmoteListKind,
  FITTINGS,
} from "@/components/emote/emote-actions";

type EmoteMenuState = {
  context: EmoteListContext;
  controller: ReturnType<typeof createMenuController<PanelEmote>>;
  fittingOf: (emote: PanelEmote) => Fitting;
  setFitting: (emote: PanelEmote, fitting: Fitting) => void;
  /** False when a left click does nothing: no selection, no `aria-pressed`. */
  selectable: boolean;
  selectedKeys: ReadonlySet<string>;
  /** Left click / Enter on an emote: selects it, or deselects it when it's selected. */
  activate: (emote: PanelEmote) => void;
  clearSelection: () => void;
  /** Called by the list with what it shows, so emotes that leave it leave the selection. */
  syncSelection: (emotes: readonly PanelEmote[]) => void;
  /** The tile that last had focus or opened the menu, so focus can go back to it. */
  triggerRef: React.RefObject<HTMLElement | null>;
};

const EmoteMenuContext = createContext<EmoteMenuState | null>(null);

export function useEmoteMenu() {
  const state = useContext(EmoteMenuContext);
  if (!state) throw new Error("<Emote> must be rendered inside <EmoteMenu>.");
  return state;
}

type EmoteMenuProps = EmoteListContext & {
  children: ReactNode;
  /** Runs on left click / Enter after the emote is selected. */
  onOpen?: (emote: PanelEmote) => void;
  /** Off where a click on the emote has nothing to add (Quick add's preview). */
  selectable?: boolean;
};

/**
 * One context menu for a whole list of emotes: every `<Emote>` inside is a context
 * trigger that hands its emote to this menu as the payload. Per-emote UI state (the
 * temporary fitting, the selection) lives here, keyed by `emote.key`, so it survives
 * virtualized tiles unmounting while they're scrolled away. The selected emote gets the
 * selection bar at the bottom of the screen, with the same actions as the menu.
 */
export function EmoteMenu({
  children,
  onOpen,
  selectable = true,
  kind,
  guild,
  canManage,
}: EmoteMenuProps) {
  const id = useId();
  const [controller] = useState(() => createMenuController<PanelEmote>());
  const [fittings, setFittings] = useState<Record<string, Fitting>>({});
  const selected = useSelectedEmotes(id);
  const triggerRef = useRef<HTMLElement | null>(null);

  // A list that changes kind (Emotes → Removed) or goes away (route change) lets go
  // biome-ignore lint/correctness/useExhaustiveDependencies: kind is the trigger
  useEffect(() => () => emoteSelection.clear(id), [id, kind]);

  const fittingOf = useCallback(
    (emote: PanelEmote) => fittings[emote.key] ?? "contain",
    [fittings]
  );
  const setFitting = useCallback(
    (emote: PanelEmote, fitting: Fitting) =>
      setFittings((current) => ({ ...current, [emote.key]: fitting })),
    []
  );
  const selectedKeys = useMemo(() => new Set(selected.map(({ key }) => key)), [selected]);
  const activate = useCallback(
    (emote: PanelEmote) => {
      if (!selectable) return;
      if (selectedKeys.has(emote.key)) {
        emoteSelection.clear(id);
        return;
      }
      emoteSelection.replace(id, [emote]);
      onOpen?.(emote);
    },
    [id, onOpen, selectable, selectedKeys]
  );
  const clearSelection = useCallback(() => emoteSelection.clear(id), [id]);
  const syncSelection = useCallback(
    (emotes: readonly PanelEmote[]) => emoteSelection.sync(id, emotes),
    [id]
  );

  const context = useMemo(() => ({ kind, guild, canManage }), [kind, guild, canManage]);
  const state = useMemo(
    () => ({
      context,
      controller,
      fittingOf,
      setFitting,
      selectable,
      selectedKeys,
      activate,
      clearSelection,
      syncSelection,
      triggerRef,
    }),
    [
      context,
      controller,
      fittingOf,
      setFitting,
      selectable,
      selectedKeys,
      activate,
      clearSelection,
      syncSelection,
    ]
  );

  const current = selectable ? selected[0] : undefined;

  return (
    <EmoteMenuContext value={state}>
      {children}
      {current && (
        <EmoteSelectionBar
          // Keyed so a newly selected emote starts with closed menus
          key={current.key}
          emote={current}
          context={context}
          fitting={fittingOf(current)}
          onFittingChange={(fitting) => setFitting(current, fitting)}
          onClose={clearSelection}
          onFocusLeave={() => focusTile(triggerRef.current)}
        />
      )}
      {selectable && <SelectionAnnouncer emote={current} />}
      <Menu controller={controller}>
        <MenuContent<PanelEmote>
          // The tile may be gone (removed) or remounted (virtualized) by the time it closes
          finalFocus={() => (triggerRef.current?.isConnected ? triggerRef.current : null)}
        >
          {({ payload }) =>
            payload && (
              <EmoteContextMenuItems
                emote={payload}
                context={context}
                fitting={fittingOf(payload)}
                onFittingChange={(fitting) => setFitting(payload, fitting)}
              />
            )
          }
        </MenuContent>
      </Menu>
    </EmoteMenuContext>
  );
}

// Back to the tile, or, when it's gone (removed), to whatever holds its list's tab stop
const focusTile = (tile: HTMLElement | null) => {
  if (!tile) return;
  if (tile.isConnected) {
    tile.focus();
    return;
  }
  const list = tileLists.get(tile);
  const next =
    list?.querySelector<HTMLElement>('[data-emote][tabindex="0"]') ??
    list?.querySelector<HTMLElement>("[data-emote]");
  next?.focus();
};

// The list a tile was in, remembered while it's still attached
const tileLists = new WeakMap<HTMLElement, Element>();
export const rememberTileList = (tile: HTMLElement) => {
  const list = tile.closest("ul");
  if (list) tileLists.set(tile, list);
};

// Polite, so it waits for whatever the screen reader is saying about the tile
function SelectionAnnouncer({ emote }: { emote?: PanelEmote }) {
  const [message, setMessage] = useState("");
  const previous = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (emote?.key === previous.current) return;
    if (emote) setMessage(`selected ${emote.name}. its actions follow the list`);
    else if (previous.current) setMessage("selection cleared");
    previous.current = emote?.key;
  }, [emote]);

  return (
    <p role="status" className="sr-only">
      {message}
    </p>
  );
}

type EmoteContextMenuItemsProps = {
  emote: PanelEmote;
  context: EmoteListContext;
  fitting: Fitting;
  onFittingChange: (fitting: Fitting) => void;
};

function EmoteContextMenuItems({
  emote,
  context,
  fitting,
  onFittingChange,
}: EmoteContextMenuItemsProps) {
  const actions = useEmoteActions(emote, context, fitting);
  return (
    <>
      <MenuGroup>
        <MenuGroupLabel className="max-w-64 truncate">
          :{emote.name}:{fitting !== "contain" && ` · ${fitting}`}
        </MenuGroupLabel>
      </MenuGroup>
      <EmoteActionItems
        emote={emote}
        actions={actions}
        kind={context.kind}
        fitting={fitting}
        onFittingChange={onFittingChange}
      />
    </>
  );
}
