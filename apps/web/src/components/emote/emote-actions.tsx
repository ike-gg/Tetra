import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Fragment, type ReactElement, type ReactNode } from "react";

import { EmoteInfo } from "@/components/emote/emote-info";
import { GuildIcon } from "@/components/panel/guild-icon";
import {
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
import { downloadEmote, useEditInQuickEditor } from "@/lib/emote-file";
import { useAddEmote, useRemoveEmote, useRestoreEmote } from "@/lib/emote-mutations";
import { guildsQueryOptions, type ManagedGuild, sortByName } from "@/lib/guilds";

/**
 * Where a list of emotes is shown. It decides which actions the menu offers:
 * `server` = a server's live emotes, `removed` = removed ones that can come back,
 * `task` = an editor task's source file, `catalog` = found on 7TV, BTTV, FFZ or by link.
 */
export type EmoteListKind = "server" | "removed" | "task" | "catalog";

export type EmoteListContext = {
  kind: EmoteListKind;
  /** The server the list belongs to (remove, restore), or a catalog's preferred target. */
  guild?: Pick<ManagedGuild, "id" | "name">;
  /** Whether the user can change that server's emotes. */
  canManage?: boolean;
};

export const FITTINGS: { value: Fitting; label: string; hint: string }[] = [
  { value: "contain", label: "Contain", hint: "whole emote, padded" },
  { value: "cover", label: "Cover", hint: "fills the square, crops" },
  { value: "fill", label: "Fill", hint: "stretches to a square" },
];

/**
 * Where the selection bar shows an action: `primary` = the list's main action, always a
 * button; `bar` = a button when the bar has room, else in More; `more` = always in More.
 * The context menu shows every action.
 */
type Placement = "primary" | "bar" | "more";

export type EmoteAction = {
  id: string;
  label: string;
  /** Shorter label for the bar's button. */
  barLabel?: string;
  /** Shortest, for the main button on a phone. */
  compactLabel?: string;
  placement: Placement;
  /** Menus put a separator between sections. */
  section: "main" | "file" | "share";
  variant?: "default" | "destructive";
  disabled?: boolean;
  /** Why it's disabled or what it'll do, in muted mono after the label. */
  hint?: string;
} & (
  | { type: "run"; run: () => void }
  /** An in-app link (a TanStack `<Link />`), rendered as the item or button. */
  | { type: "link"; render: ReactElement<Record<string, unknown>> }
  /** Opens in a new tab. */
  | { type: "external"; href: string }
  /** "Add to server": a submenu in menus, a dropdown in the bar. */
  | { type: "add-to-server" }
  /** A read-only line. */
  | { type: "note" }
);

/**
 * Every action on an emote, for the list's context menu and the selection bar alike, so
 * a new action shows up in both. Guard it by the list's `kind`, `canManage` and the
 * emote's fields here.
 */
export function useEmoteActions(
  emote: PanelEmote,
  { kind, guild, canManage }: EmoteListContext,
  fitting: Fitting
): EmoteAction[] {
  const guilds = useQuery(guildsQueryOptions);
  const add = useAddEmote();
  const remove = useRemoveEmote(guild?.id ?? "");
  const restore = useRestoreEmote(guild?.id ?? "");
  const editInQuickEditor = useEditInQuickEditor();
  const managesHere = Boolean(guild && canManage);
  const actions: EmoteAction[] = [];

  if (kind === "removed" && guild && managesHere) {
    actions.push({
      id: "restore",
      type: "run",
      label: `Restore to ${guild.name}`,
      barLabel: "Restore",
      placement: "primary",
      section: "main",
      run: () => restore(emote, guild.name),
    });
  }

  if (kind === "task" && emote.taskId) {
    actions.push({
      id: "open-task",
      type: "link",
      label: "Open in editor",
      compactLabel: "Open",
      placement: "primary",
      section: "main",
      render: <Link to="/panel/tasks/$taskId" params={{ taskId: emote.taskId }} />,
    });
  }

  // A catalog opened for one server (Browse from a server view) offers it right away
  const preferred =
    kind === "catalog" && guild
      ? guilds.data?.guildsWithUserPermissions.find(({ id }) => id === guild.id)
      : undefined;
  if (preferred) {
    const slots = emote.animated ? "animated" : "static";
    const full = preferred.emojis.limit - preferred.emojis[slots] <= 0;
    actions.push({
      id: "add-here",
      type: "run",
      label: `Add to ${preferred.name}`,
      compactLabel: "Add here",
      placement: "primary",
      section: "main",
      disabled: full,
      hint: full ? `${slots} full` : undefined,
      run: () => void add({ emote, guild: preferred, fitting }),
    });
  }

  if (kind !== "task") {
    actions.push({
      id: "add-to-server",
      type: "add-to-server",
      label: "Add to server",
      compactLabel: "Add",
      placement:
        kind === "server" || (kind === "catalog" && !preferred) ? "primary" : "bar",
      section: "main",
    });
  }

  if (kind === "server" && guild && managesHere) {
    actions.push(
      emote.managed
        ? {
            id: "managed",
            type: "note",
            label: "Managed by an integration",
            placement: "more",
            section: "main",
          }
        : {
            id: "remove",
            type: "run",
            label: `Remove from ${guild.name}`,
            barLabel: "Remove",
            placement: "bar",
            section: "main",
            variant: "destructive",
            run: () => remove(emote, guild.name),
          }
    );
  }

  actions.push({
    id: "download",
    type: "run",
    label: "Download",
    placement: "bar",
    section: "file",
    run: () => downloadEmote(emote),
  });

  // Tasks have the panel's editor, which adds the result back
  if (kind !== "task") {
    actions.push({
      id: "edit",
      type: "run",
      label: "Edit in editor",
      placement: "bar",
      section: "file",
      run: () => editInQuickEditor(emote),
    });
  }

  actions.push(
    {
      id: "copy-name",
      type: "run",
      label: "Copy name",
      placement: "more",
      section: "share",
      run: () => void copy(emote.name, "name"),
    },
    {
      id: "copy-link",
      type: "run",
      label: "Copy image link",
      placement: "more",
      section: "share",
      run: () => void copy(emote.url, "image link"),
    },
    {
      id: "open-original",
      type: "external",
      label: "Open original",
      placement: "more",
      section: "share",
      href: emote.pageUrl ?? emote.url,
    }
  );

  return actions;
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

function Hint({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <span className="ml-auto shrink-0 pl-4 font-mono text-muted text-xs">{children}</span>
  );
}

/** The user's manageable servers as menu items, with free slots for the emote's type. */
export function AddToServerItems({
  emote,
  fitting,
}: {
  emote: PanelEmote;
  fitting: Fitting;
}) {
  const guilds = useQuery(guildsQueryOptions);
  const add = useAddEmote();
  const slots = emote.animated ? "animated" : "static";
  const targets = sortByName(guilds.data?.guildsWithUserPermissions ?? []);

  return (
    <>
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
            onSelect={() => void add({ emote, guild: target, fitting })}
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
    </>
  );
}

function ActionMenuItem({
  action,
  emote,
  fitting,
}: {
  action: EmoteAction;
  emote: PanelEmote;
  fitting: Fitting;
}) {
  switch (action.type) {
    case "run":
      return (
        <MenuItem
          variant={action.variant}
          disabled={action.disabled}
          onSelect={action.run}
        >
          <span className="min-w-0 truncate">{action.label}</span>
          <Hint>{action.hint}</Hint>
        </MenuItem>
      );
    case "link":
      return <MenuItem render={action.render}>{action.label}</MenuItem>;
    case "external":
      return (
        <MenuItem render={<a href={action.href} target="_blank" rel="noreferrer" />}>
          {action.label}
          <span aria-hidden="true" className="-ml-1 font-mono text-muted text-xs">
            {"↗︎"}
          </span>
        </MenuItem>
      );
    case "add-to-server":
      return (
        <MenuSub>
          <MenuSubTrigger>{action.label}</MenuSubTrigger>
          <MenuSubContent className="max-w-80">
            <AddToServerItems emote={emote} fitting={fitting} />
          </MenuSubContent>
        </MenuSub>
      );
    case "note":
      return (
        <MenuItem variant="info">
          <span className="text-muted">{action.label}</span>
        </MenuItem>
      );
  }
}

type EmoteActionItemsProps = {
  emote: PanelEmote;
  actions: EmoteAction[];
  kind: EmoteListKind;
  fitting: Fitting;
  onFittingChange: (fitting: Fitting) => void;
};

/**
 * Actions as menu items, in sections, plus the Temporary fitting and Info submenus.
 * The context menu passes every action, the bar's More menu the ones without a button.
 */
export function EmoteActionItems({
  emote,
  actions,
  kind,
  fitting,
  onFittingChange,
}: EmoteActionItemsProps) {
  const items = (section: EmoteAction["section"]) =>
    actions
      .filter((action) => action.section === section)
      .map((action) => (
        <ActionMenuItem key={action.id} action={action} emote={emote} fitting={fitting} />
      ));
  const fittingMenu = kind !== "task" && (
    <MenuSub key="fitting">
      <MenuSubTrigger>Temporary fitting</MenuSubTrigger>
      <MenuSubContent>
        <MenuGroup>
          <MenuGroupLabel>used by Add to server</MenuGroupLabel>
          <MenuRadioGroup<Fitting> value={fitting} onValueChange={onFittingChange}>
            {FITTINGS.map(({ value, label, hint }) => (
              <MenuRadioItem key={value} value={value} label={label}>
                {label}
                <Hint>{hint}</Hint>
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
      </MenuSubContent>
    </MenuSub>
  );
  const infoMenu = (
    <MenuSub key="info">
      <MenuSubTrigger>Info</MenuSubTrigger>
      <MenuSubContent className="min-w-60">
        <EmoteInfo emote={emote} />
      </MenuSubContent>
    </MenuSub>
  );
  const sections: [string, ReactNode[]][] = [
    ["main", [...items("main"), fittingMenu].filter(Boolean)],
    ["file", items("file")],
    ["share", [...items("share"), infoMenu]],
  ];

  return sections
    .filter(([, nodes]) => nodes.length > 0)
    .map(([name, nodes], index) => (
      <Fragment key={name}>
        {index > 0 && <MenuSeparator />}
        {nodes}
      </Fragment>
    ));
}
