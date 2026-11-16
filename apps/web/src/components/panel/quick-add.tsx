import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";

import { Emote } from "@/components/emote/emote";
import { EmoteMenu, FITTINGS, useEmoteMenu } from "@/components/emote/emote-menu";
import { GuildIcon } from "@/components/panel/guild-icon";
import { PanelLoading } from "@/components/panel/query-state";
import { Button } from "@/components/ui/button";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import {
  looksLikeEmoteLink,
  lookupErrorMessage,
  resolveEmoteQueryOptions,
} from "@/lib/catalog";
import { cn } from "@/lib/cn";
import {
  type Fitting,
  fromCatalogEmote,
  isDiscordEmoteName,
  type PanelEmote,
  SOURCE_LABELS,
  toDiscordEmoteName,
} from "@/lib/emote";
import { useEditInQuickEditor } from "@/lib/emote-file";
import { useAddEmote } from "@/lib/emote-mutations";
import {
  type GuildLists,
  guildsQueryOptions,
  type ManagedGuild,
  sortByName,
} from "@/lib/guilds";

const TYPING_DELAY = 500;
const MIN_SEARCH_LENGTH = 3;

// Picked for the user only when there's no doubt: the server page the form sits on, or
// the one server they manage. Remembering the last server was dropped: on Home it
// silently offered a server that had nothing to do with the paste.
const defaultTarget = (lists: GuildLists | undefined, preset: string | undefined) => {
  if (preset) return preset;
  const manageable = lists?.guildsWithUserPermissions ?? [];
  return manageable.length === 1 ? (manageable[0]?.id ?? null) : null;
};

const freeSlots = (guild: ManagedGuild, emote: PanelEmote) =>
  guild.emojis.limit - guild.emojis[emote.animated ? "animated" : "static"];

type QuickAddProps = {
  /** A link to resolve right away (pasted somewhere in the panel). */
  initialText?: string;
  /** The server to add to (a server's own page); Search keeps it for Browse. */
  defaultGuildId?: string;
  /** Hides the label and help line, for a toolbar where the placeholder says enough. */
  compact?: boolean;
  placeholder?: string;
  /** Runs after the emote was added; the field is cleared first. */
  onAdded?: () => void;
  /** Runs when plain text was sent to Browse as a search. */
  onSearch?: () => void;
  /** Runs once the emote opened in the editor. */
  onOpenedInEditor?: () => void;
  className?: string;
};

/**
 * One field for both: a link (or a Discord emoji mention) resolves inline (debounced
 * while typing, at once on paste or Enter) into a preview with an editable name, the
 * server and the fitting; plain text of 3+ characters searches 7TV in Browse on Enter or
 * the Search button.
 */
export function QuickAdd({
  initialText = "",
  defaultGuildId,
  compact = false,
  placeholder = "search 7TV or paste a link",
  onAdded,
  onSearch,
  onOpenedInEditor,
  className,
}: QuickAddProps) {
  const [text, setText] = useState(initialText);
  const [submitted, setSubmitted] = useState(() =>
    looksLikeEmoteLink(initialText.trim()) ? initialText.trim() : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const guilds = useQuery(guildsQueryOptions);
  const [chosen, setChosen] = useState<string | null>(null);
  const target = chosen ?? defaultTarget(guilds.data, defaultGuildId);

  const trimmed = text.trim();
  const isLink = looksLikeEmoteLink(trimmed);
  const canSearch = !isLink && trimmed.length >= MIN_SEARCH_LENGTH;

  const resolve = useQuery({
    ...resolveEmoteQueryOptions(submitted),
    enabled: submitted.length > 0,
  });

  // Only links resolve; plain text waits for Enter or Search
  useEffect(() => {
    if (!isLink || trimmed === submitted) return;
    const timer = setTimeout(() => setSubmitted(trimmed), TYPING_DELAY);
    return () => clearTimeout(timer);
  }, [isLink, trimmed, submitted]);

  const emote = useMemo(
    () => (resolve.data ? fromCatalogEmote(resolve.data) : undefined),
    [resolve.data]
  );
  const current = isLink && trimmed === submitted;
  const error =
    current && resolve.isError ? lookupErrorMessage(resolve.error) : undefined;
  const defaultGuild = guilds.data?.guildsWithUserPermissions.find(
    ({ id }) => id === defaultGuildId
  );

  const search = () => {
    if (!canSearch) return;
    void navigate({ to: "/panel/browse", search: { q: trimmed, guild: defaultGuildId } });
    onSearch?.();
  };

  const done = () => {
    setText("");
    setSubmitted("");
    inputRef.current?.focus();
    onAdded?.();
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <TextField
        label="quick add"
        hideLabel={compact}
        name="emote-query"
        type="search"
        inputRef={inputRef}
        value={text}
        onValueChange={setText}
        // A pasted link is finished: resolve it once the input holds it, no typing delay
        onPaste={(event) => {
          const input = event.currentTarget;
          setTimeout(() => {
            const pasted = input.value.trim();
            if (looksLikeEmoteLink(pasted)) setSubmitted(pasted);
          });
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (!isLink) search();
          else if (current && resolve.isError) void resolve.refetch();
          else setSubmitted(trimmed);
        }}
        placeholder={placeholder}
        description={
          compact
            ? undefined
            : "links from 7TV, BTTV, FFZ, Discord, Twitch or any image. paste one anywhere in the panel"
        }
        error={error}
        action={
          // Disabled for a link too: links resolve on their own
          <Button size="sm" disabled={!canSearch} onClick={search}>
            search
          </Button>
        }
      />

      {submitted && resolve.isFetching && !resolve.data && (
        <PanelLoading>reading the link</PanelLoading>
      )}

      {emote && current && (
        <EmoteMenu
          kind="catalog"
          guild={defaultGuild && { id: defaultGuild.id, name: defaultGuild.name }}
          // The form around it already is what the selection bar would offer
          selectable={false}
        >
          <QuickAddDetails
            key={emote.key}
            emote={emote}
            target={target}
            onTargetChange={setChosen}
            onAdded={done}
            onOpenedInEditor={onOpenedInEditor}
          />
        </EmoteMenu>
      )}
    </div>
  );
}

type DetailsProps = {
  emote: PanelEmote;
  target: string | null;
  onTargetChange: (id: string) => void;
  onAdded: () => void;
  onOpenedInEditor?: () => void;
};

function QuickAddDetails({
  emote,
  target,
  onTargetChange,
  onAdded,
  onOpenedInEditor,
}: DetailsProps) {
  const guilds = useQuery(guildsQueryOptions);
  const add = useAddEmote();
  const editInEditor = useEditInQuickEditor();
  const [opening, setOpening] = useState(false);
  const { fittingOf, setFitting } = useEmoteMenu();
  const [name, setName] = useState(() => toDiscordEmoteName(emote.name));
  const [adding, setAdding] = useState(false);
  const fittingLabel = useId();

  const valid = isDiscordEmoteName(name);
  const fitting = fittingOf(emote);
  // The preview carries the edited name, so its menu's Add to server uses it too
  const preview = useMemo(
    () => ({ ...emote, name: valid ? name : toDiscordEmoteName(emote.name) }),
    [emote, name, valid]
  );

  const servers = sortByName(guilds.data?.guildsWithUserPermissions ?? []);
  // A preset server without room for this type leaves nothing picked
  const picked = servers.find(
    (guild) => guild.id === target && freeSlots(guild, emote) > 0
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || !picked || adding) return;
    setAdding(true);
    const added = await add({ emote: preview, guild: picked, fitting });
    setAdding(false);
    if (added) onAdded();
  };

  const openInEditor = async () => {
    if (opening) return;
    setOpening(true);
    const opened = await editInEditor(preview);
    setOpening(false);
    if (opened) onOpenedInEditor?.();
  };

  const renamed = toDiscordEmoteName(emote.name) !== emote.name;
  const nameHint =
    emote.source === "link" && emote.name === "emote"
      ? "the link has no name of its own. pick one"
      : renamed
        ? `cleaned up from “${emote.name}”: Discord takes only letters, numbers and _`
        : undefined;

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="relative flex flex-col gap-5 border border-border p-4"
    >
      <div className="flex items-start gap-4">
        <div className="w-24 shrink-0 sm:w-28">
          <Emote emote={preview} showName={false} className="w-full" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <TextField
            label="name"
            name="emote-name"
            value={name}
            onValueChange={setName}
            prefix=":"
            suffix=":"
            error={valid ? undefined : "2–32 letters, numbers or _"}
            description={nameHint}
          />
          <p className="font-mono text-muted text-xs">
            {SOURCE_LABELS[emote.source]} · {emote.animated ? "animated" : "static"}
            {emote.width && emote.height ? ` · ${emote.width} × ${emote.height}` : ""}
          </p>
        </div>
      </div>

      <ServerPicker
        emote={emote}
        servers={servers}
        loading={guilds.status === "pending"}
        value={picked?.id ?? null}
        onValueChange={onTargetChange}
      />

      <div className="flex flex-col gap-1.5">
        <p id={fittingLabel} className="font-medium text-foreground text-sm">
          fitting
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            aria-labelledby={fittingLabel}
            value={fitting}
            onValueChange={(next) => next && setFitting(emote, next as Fitting)}
          >
            {FITTINGS.map(({ value, label }) => (
              <SegmentedControlItem key={value} value={value}>
                {label}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
          <span className="font-mono text-muted text-xs">
            {FITTINGS.find(({ value }) => value === fitting)?.hint}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          disabled={opening}
          data-pending={opening || undefined}
          aria-busy={opening || undefined}
          onClick={() => void openInEditor()}
        >
          {opening ? "opening" : "open in editor"}
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!valid || !picked}
          data-pending={adding || undefined}
          aria-busy={adding || undefined}
        >
          {adding ? "adding" : picked ? `add to ${picked.name}` : "pick a server"}
        </Button>
      </div>
    </form>
  );
}

type ServerPickerProps = {
  emote: PanelEmote;
  servers: ManagedGuild[];
  loading: boolean;
  value: string | null;
  onValueChange: (id: string) => void;
};

function ServerPicker({
  emote,
  servers,
  loading,
  value,
  onValueChange,
}: ServerPickerProps) {
  const slots = emote.animated ? "animated" : "static";
  const picked = servers.find((guild) => guild.id === value);

  return (
    <Select<string>
      value={value}
      onValueChange={(next) => next && onValueChange(next)}
      placeholder={loading ? "loading your servers" : "pick a server"}
      disabled={servers.length === 0}
    >
      <div className="flex flex-col gap-1.5">
        <SelectLabel className="font-medium text-foreground text-sm">add to</SelectLabel>
        <SelectTrigger>
          {picked && <GuildIcon guild={picked} size="sm" />}
          <SelectValue className="min-w-0 truncate" />
          {picked && (
            <span className="shrink-0 font-mono text-muted text-xs tabular-nums">
              {freeSlots(picked, emote)} free
            </span>
          )}
        </SelectTrigger>
        {!loading && servers.length === 0 && (
          <p className="text-muted text-xs">no servers you can manage yet</p>
        )}
      </div>
      <SelectContent>
        {servers.map((guild) => {
          const free = freeSlots(guild, emote);
          const full = free <= 0;
          return (
            // Full servers stay listed so it's clear why they can't take it
            <SelectItem
              key={guild.id}
              value={guild.id}
              label={guild.name}
              disabled={full}
            >
              <GuildIcon guild={guild} size="sm" className={cn(full && "opacity-50")} />
              <span className="min-w-0 truncate">{guild.name}</span>
              <span className="ml-auto shrink-0 pl-4 font-mono text-muted text-xs tabular-nums">
                {full ? `${slots} full` : `${free} free`}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
