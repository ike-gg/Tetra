import { useQuery } from "@tanstack/react-query";
import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";

import { Emote } from "@/components/emote/emote";
import { EmoteMenu, FITTINGS, useEmoteMenu } from "@/components/emote/emote-menu";
import { GuildIcon } from "@/components/panel/guild-icon";
import { PanelLoading } from "@/components/panel/query-state";
import { Button } from "@/components/ui/button";
import { Checkbox, CheckboxGroup } from "@/components/ui/checkbox";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { TextField } from "@/components/ui/text-field";
import { lookupErrorMessage, resolveEmoteQueryOptions } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import {
  type Fitting,
  fromCatalogEmote,
  isDiscordEmoteName,
  type PanelEmote,
  SOURCE_LABELS,
  toDiscordEmoteName,
} from "@/lib/emote";
import { useAddEmote } from "@/lib/emote-mutations";
import {
  type GuildLists,
  guildsQueryOptions,
  type ManagedGuild,
  sortByName,
} from "@/lib/guilds";

const TYPING_DELAY = 500;
const TARGETS_KEY = "tetra:quick-add-targets";

// The servers picked last time, so adding a run of emotes to one server takes no clicks
const readLastTargets = (): string[] => {
  try {
    const stored = JSON.parse(localStorage.getItem(TARGETS_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
};

const saveLastTargets = (ids: string[]) => {
  try {
    localStorage.setItem(TARGETS_KEY, JSON.stringify(ids));
  } catch {
    // Storage blocked: the picker just starts empty next time
  }
};

const defaultTargets = (lists: GuildLists | undefined) => {
  const manageable = lists?.guildsWithUserPermissions ?? [];
  const last = readLastTargets().filter((id) =>
    manageable.some((guild) => guild.id === id)
  );
  if (last.length > 0) return last;
  return manageable.length === 1 && manageable[0] ? [manageable[0].id] : [];
};

const freeSlots = (guild: ManagedGuild, emote: PanelEmote) =>
  guild.emojis.limit - guild.emojis[emote.animated ? "animated" : "static"];

type QuickAddProps = {
  /** Text to resolve right away (a link pasted somewhere in the panel). */
  initialText?: string;
  /** An emote that's already known (picked in Browse): no lookup, straight to the form. */
  initialEmote?: PanelEmote;
  /** Server to add to instead of the last used ones. */
  defaultGuildId?: string;
  /** Hides the label and help line, for a toolbar where the placeholder says enough. */
  compact?: boolean;
  placeholder?: string;
  /** Runs after the emote was added everywhere it was sent; the field is cleared first. */
  onAdded?: () => void;
  className?: string;
};

/**
 * Paste a link, check the emote, add it: resolves the link (debounced while typing, at
 * once on paste or Enter), then shows a preview with an editable name, the servers to add
 * it to and the fitting.
 */
export function QuickAdd({
  initialText = "",
  initialEmote,
  defaultGuildId,
  compact = false,
  placeholder = "Paste a 7TV, BTTV, FFZ, Discord, Twitch or image link",
  onAdded,
  className,
}: QuickAddProps) {
  const [text, setText] = useState(initialText);
  const [submitted, setSubmitted] = useState(initialText.trim());
  const [known, setKnown] = useState(initialEmote ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const guilds = useQuery(guildsQueryOptions);
  const [chosen, setChosen] = useState<string[] | null>(
    defaultGuildId ? [defaultGuildId] : null
  );
  const targets = chosen ?? defaultTargets(guilds.data);

  const resolve = useQuery({
    ...resolveEmoteQueryOptions(submitted),
    enabled: !known && submitted.length > 0,
  });

  useEffect(() => {
    const next = text.trim();
    if (next === submitted) return;
    const timer = setTimeout(() => setSubmitted(next), TYPING_DELAY);
    return () => clearTimeout(timer);
  }, [text, submitted]);

  const emote = useMemo(
    () => known ?? (resolve.data ? fromCatalogEmote(resolve.data) : undefined),
    [known, resolve.data]
  );
  const current = text.trim() === submitted;
  const error =
    current && resolve.isError ? lookupErrorMessage(resolve.error) : undefined;
  const defaultGuild = guilds.data?.guildsWithUserPermissions.find(
    ({ id }) => id === defaultGuildId
  );

  const changeTargets = (ids: string[]) => {
    setChosen(ids);
    saveLastTargets(ids);
  };

  const done = () => {
    setText("");
    setSubmitted("");
    setKnown(null);
    inputRef.current?.focus();
    onAdded?.();
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <TextField
        label="Quick add"
        hideLabel={compact}
        name="emote-link"
        type="url"
        inputRef={inputRef}
        value={text}
        onValueChange={(next) => {
          setText(next);
          setKnown(null);
        }}
        // A paste is a finished link: resolve it once the input holds it, no typing delay
        onPaste={(event) => {
          const input = event.currentTarget;
          setTimeout(() => setSubmitted(input.value.trim()));
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (current && resolve.isError) void resolve.refetch();
          else setSubmitted(text.trim());
        }}
        placeholder={placeholder}
        description={compact ? undefined : "Or just paste a link anywhere in the panel."}
        error={error}
      />

      {!known && submitted && resolve.isFetching && !resolve.data && (
        <PanelLoading>reading the link…</PanelLoading>
      )}

      {emote && (known || current) && (
        <EmoteMenu
          kind="catalog"
          guild={defaultGuild && { id: defaultGuild.id, name: defaultGuild.name }}
        >
          <QuickAddDetails
            key={emote.key}
            emote={emote}
            targets={targets}
            onTargetsChange={changeTargets}
            onAdded={done}
          />
        </EmoteMenu>
      )}
    </div>
  );
}

type DetailsProps = {
  emote: PanelEmote;
  targets: string[];
  onTargetsChange: (ids: string[]) => void;
  onAdded: () => void;
};

function QuickAddDetails({ emote, targets, onTargetsChange, onAdded }: DetailsProps) {
  const guilds = useQuery(guildsQueryOptions);
  const add = useAddEmote();
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
  // A picked server that has no room for this type is skipped, not silently kept
  const picked = servers.filter(
    (guild) => targets.includes(guild.id) && freeSlots(guild, emote) > 0
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid || picked.length === 0 || adding) return;
    setAdding(true);
    const results = await Promise.all(
      picked.map((guild) => add({ emote: preview, guild, fitting }))
    );
    setAdding(false);
    if (results.every(Boolean)) onAdded();
  };

  const renamed = toDiscordEmoteName(emote.name) !== emote.name;
  const nameHint =
    emote.source === "link" && emote.name === "emote"
      ? "The link has no name of its own. Pick one."
      : renamed
        ? `Cleaned up from “${emote.name}”: Discord takes only letters, numbers and _.`
        : undefined;

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="flex flex-col gap-5 border border-border p-4"
    >
      <div className="flex items-start gap-4">
        <div className="w-24 shrink-0 sm:w-28">
          <Emote emote={preview} showName={false} className="w-full" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <TextField
            label="Name"
            name="emote-name"
            value={name}
            onValueChange={setName}
            prefix=":"
            suffix=":"
            error={valid ? undefined : "2–32 letters, numbers or _."}
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
        targets={targets}
        onTargetsChange={onTargetsChange}
      />

      <div className="flex flex-col gap-1.5">
        <p id={fittingLabel} className="font-medium text-foreground text-sm">
          Fitting
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

      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          disabled={!valid || picked.length === 0}
          data-pending={adding || undefined}
          aria-busy={adding || undefined}
        >
          {adding
            ? "Adding…"
            : picked.length === 0
              ? "Pick a server"
              : picked.length === 1
                ? `Add to ${picked[0]?.name}`
                : `Add to ${picked.length} servers`}
        </Button>
      </div>
    </form>
  );
}

type ServerPickerProps = {
  emote: PanelEmote;
  servers: ManagedGuild[];
  loading: boolean;
  targets: string[];
  onTargetsChange: (ids: string[]) => void;
};

function ServerPicker({
  emote,
  servers,
  loading,
  targets,
  onTargetsChange,
}: ServerPickerProps) {
  const labelId = useId();
  const slots = emote.animated ? "animated" : "static";

  return (
    <div className="flex flex-col gap-1.5">
      <p id={labelId} className="font-medium text-foreground text-sm">
        Add to
      </p>
      {loading && <PanelLoading>loading your servers…</PanelLoading>}
      {!loading && servers.length === 0 && (
        <p className="text-muted text-sm">No servers you can manage yet.</p>
      )}
      {servers.length > 0 && (
        <CheckboxGroup
          aria-labelledby={labelId}
          value={targets}
          onValueChange={(ids) => onTargetsChange(ids)}
          // relative: the checkboxes' hidden inputs are placed against it, not the page
          className="relative flex max-h-52 flex-col gap-px overflow-y-auto overscroll-contain border border-border"
        >
          {servers.map((guild) => {
            const free = freeSlots(guild, emote);
            const full = free <= 0;
            return (
              // biome-ignore lint/a11y/noLabelWithoutControl: Checkbox renders the control inside the label, as ui-sdk documents
              <label
                key={guild.id}
                className={cn(
                  "flex h-9 shrink-0 cursor-default select-none items-center gap-2.5 px-3 text-sm",
                  full ? "cursor-not-allowed text-muted" : "hover:bg-surface"
                )}
              >
                <Checkbox value={guild.id} disabled={full} />
                <GuildIcon guild={guild} size="sm" />
                <span className="min-w-0 truncate">{guild.name}</span>
                <span className="ml-auto shrink-0 pl-4 font-mono text-muted text-xs tabular-nums">
                  {full ? `${slots} full` : `${free} free`}
                </span>
              </label>
            );
          })}
        </CheckboxGroup>
      )}
    </div>
  );
}
