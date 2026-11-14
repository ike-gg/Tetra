import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { EmoteInfo } from "@/components/emote/emote-info";
import { GuildIcon } from "@/components/panel/guild-icon";
import {
  createMenuController,
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from "@/components/ui/menu";
import { toast } from "@/components/ui/toaster";
import type { Fitting, PanelEmote } from "@/lib/emote";
import { useAddEmote, useRemoveEmote, useRestoreEmote } from "@/lib/emote-mutations";
import { guildsQueryOptions, type ManagedGuild, sortByName } from "@/lib/guilds";

/**
 * Where a list of emotes is shown. It decides which actions the menu offers:
 * `server` = a server's live emotes, `removed` = removed ones that can come back,
 * `task` = an editor task's source file. Browse lists (7TV, BTTV) get their own kind.
 */
export type EmoteListKind = "server" | "removed" | "task";

export type EmoteListContext = {
  kind: EmoteListKind;
  /** The server the list belongs to, for remove and restore. */
  guild?: Pick<ManagedGuild, "id" | "name">;
  /** Whether the user can change that server's emotes. */
  canManage?: boolean;
};

type EmoteMenuState = {
  context: EmoteListContext;
  controller: ReturnType<typeof createMenuController<PanelEmote>>;
  fittingOf: (emote: PanelEmote) => Fitting;
  selectedKey: string | null;
  select: (emote: PanelEmote | null) => void;
  /** Left click / Enter on an emote. */
  activate: (emote: PanelEmote) => void;
  /** The tile that opened the menu, so focus can go back after it rerenders. */
  triggerRef: React.RefObject<HTMLElement | null>;
};

const EmoteMenuContext = createContext<EmoteMenuState | null>(null);

export function useEmoteMenu() {
  const state = useContext(EmoteMenuContext);
  if (!state) throw new Error("<Emote> must be rendered inside <EmoteMenu>.");
  return state;
}

const FITTINGS: { value: Fitting; label: string; hint: string }[] = [
  { value: "contain", label: "Contain", hint: "whole emote, padded" },
  { value: "cover", label: "Cover", hint: "fills the square, crops" },
  { value: "fill", label: "Fill", hint: "stretches to a square" },
];

type EmoteMenuProps = EmoteListContext & {
  children: ReactNode;
  /**
   * Runs on left click / Enter after the emote is selected. The emote detail dialog
   * hooks in here; until then a click only selects.
   */
  onOpen?: (emote: PanelEmote) => void;
};

/**
 * One context menu for a whole list of emotes: every `<Emote>` inside is a context
 * trigger that hands its emote to this menu as the payload. Per-emote UI state (the
 * temporary fitting, the selection) lives here, so it survives virtualized tiles
 * unmounting while they're scrolled away.
 */
export function EmoteMenu({ children, onOpen, kind, guild, canManage }: EmoteMenuProps) {
  const [controller] = useState(() => createMenuController<PanelEmote>());
  const [fittings, setFittings] = useState<Record<string, Fitting>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const fittingOf = useCallback(
    (emote: PanelEmote) => fittings[emote.key] ?? "contain",
    [fittings]
  );
  const select = useCallback(
    (emote: PanelEmote | null) => setSelectedKey(emote?.key ?? null),
    []
  );
  const activate = useCallback(
    (emote: PanelEmote) => {
      setSelectedKey(emote.key);
      onOpen?.(emote);
    },
    [onOpen]
  );

  const context = useMemo(() => ({ kind, guild, canManage }), [kind, guild, canManage]);
  const state = useMemo(
    () => ({ context, controller, fittingOf, selectedKey, select, activate, triggerRef }),
    [context, controller, fittingOf, selectedKey, select, activate]
  );

  return (
    <EmoteMenuContext value={state}>
      {children}
      <Menu controller={controller}>
        <MenuContent<PanelEmote>
          // The tile may be gone (removed) or remounted (virtualized) by the time it closes
          finalFocus={() => (triggerRef.current?.isConnected ? triggerRef.current : null)}
        >
          {({ payload }) =>
            payload && (
              <EmoteMenuItems
                emote={payload}
                context={context}
                fitting={fittingOf(payload)}
                onFittingChange={(fitting) =>
                  setFittings((current) => ({ ...current, [payload.key]: fitting }))
                }
              />
            )
          }
        </MenuContent>
      </Menu>
    </EmoteMenuContext>
  );
}

type EmoteMenuItemsProps = {
  emote: PanelEmote;
  context: EmoteListContext;
  fitting: Fitting;
  onFittingChange: (fitting: Fitting) => void;
};

// Every action of the emote menu. A new action is one more item here, shown when the
// emote and the list's context allow it.
function EmoteMenuItems({
  emote,
  context,
  fitting,
  onFittingChange,
}: EmoteMenuItemsProps) {
  const { kind, guild, canManage } = context;
  const managesHere = Boolean(guild && canManage);
  const remove = useRemoveEmote(guild?.id ?? "");
  const restore = useRestoreEmote(guild?.id ?? "");

  return (
    <>
      <MenuGroup>
        <MenuGroupLabel className="max-w-64 truncate">
          :{emote.name}:{fitting !== "contain" && ` · ${fitting}`}
        </MenuGroupLabel>
      </MenuGroup>

      {kind === "removed" && guild && managesHere && (
        <MenuItem onSelect={() => restore(emote, guild.name)}>
          Restore to {guild.name}
        </MenuItem>
      )}

      {kind !== "task" && <AddToServer emote={emote} fitting={fitting} />}

      {kind === "server" &&
        guild &&
        managesHere &&
        (emote.managed ? (
          <MenuItem variant="info">
            <span className="text-muted">Managed by an integration</span>
          </MenuItem>
        ) : (
          <MenuItem variant="destructive" onSelect={() => remove(emote, guild.name)}>
            Remove from {guild.name}
          </MenuItem>
        ))}

      {kind !== "task" && (
        <MenuSub>
          <MenuSubTrigger>Temporary fitting</MenuSubTrigger>
          <MenuSubContent>
            <MenuGroup>
              <MenuGroupLabel>used by Add to server</MenuGroupLabel>
              <MenuRadioGroup<Fitting> value={fitting} onValueChange={onFittingChange}>
                {FITTINGS.map(({ value, label, hint }) => (
                  <MenuRadioItem key={value} value={value} label={label}>
                    {label}
                    <span className="ml-auto pl-4 font-mono text-muted text-xs">
                      {hint}
                    </span>
                  </MenuRadioItem>
                ))}
              </MenuRadioGroup>
            </MenuGroup>
          </MenuSubContent>
        </MenuSub>
      )}

      <MenuSeparator />

      <MenuItem onSelect={() => copy(emote.name, "name")}>Copy name</MenuItem>
      <MenuItem onSelect={() => copy(emote.url, "image link")}>Copy image link</MenuItem>
      <MenuItem render={<a href={emote.url} target="_blank" rel="noreferrer" />}>
        Open original
        <span aria-hidden="true" className="-ml-1 font-mono text-muted text-xs">
          {"\u2197\uFE0E"}
        </span>
      </MenuItem>

      <MenuSub>
        <MenuSubTrigger>Info</MenuSubTrigger>
        <MenuSubContent className="min-w-60">
          <EmoteInfo emote={emote} />
        </MenuSubContent>
      </MenuSub>
    </>
  );
}

const copy = async (text: string, what: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`Copied ${what}`);
  } catch {
    toast.error(`Couldn't copy the ${what}`, {
      description: "The browser didn't allow access to the clipboard.",
    });
  }
};

function AddToServer({ emote, fitting }: { emote: PanelEmote; fitting: Fitting }) {
  const guilds = useQuery(guildsQueryOptions);
  const add = useAddEmote();
  const slots = emote.animated ? "animated" : "static";
  const targets = sortByName(guilds.data?.guildsWithUserPermissions ?? []);

  return (
    <MenuSub>
      <MenuSubTrigger>Add to server</MenuSubTrigger>
      <MenuSubContent className="max-w-80">
        {guilds.status === "pending" && (
          <MenuItem variant="info">Loading servers…</MenuItem>
        )}
        {guilds.status === "error" && (
          <MenuItem variant="info">Couldn&apos;t load your servers</MenuItem>
        )}
        {guilds.status === "success" && targets.length === 0 && (
          <MenuItem variant="info">No servers you can manage</MenuItem>
        )}
        {targets.map((target) => {
          const free = target.emojis.limit - target.emojis[slots];
          const here = target.id === emote.guildId;
          return (
            <MenuItem
              key={target.id}
              label={target.name}
              // Full servers stay listed (and focusable) so it's clear why they can't take it
              disabled={free <= 0}
              onSelect={() => add({ emote, guild: target, fitting })}
            >
              <GuildIcon guild={target} size="sm" />
              <span className="min-w-0 truncate">{target.name}</span>
              <span className="ml-auto shrink-0 pl-4 font-mono text-muted text-xs tabular-nums">
                {here ? "here · " : ""}
                {free <= 0 ? `${slots} full` : `${free} free`}
              </span>
            </MenuItem>
          );
        })}
      </MenuSubContent>
    </MenuSub>
  );
}
