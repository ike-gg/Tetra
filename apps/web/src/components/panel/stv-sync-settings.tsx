import { type ReactNode, useState } from "react";

import { FittingPicker } from "@/components/editor/fitting-picker";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/api";
import type { Fitting } from "@/lib/emote";
import {
  type LinkedSync,
  listError,
  nameRegexError,
  parseList,
  SETTINGS_LIMITS,
  type SyncSettings,
  syncErrorMessage,
} from "@/lib/stv-sync";
import { useSaveSyncSettings } from "@/lib/stv-sync-mutations";

const FITTING_HINTS: Record<Fitting, string> = {
  contain: "keeps the emote's shape, with transparent sides, as Discord shows it",
  cover: "crops the middle square",
  fill: "stretches the emote into a square",
};

// What the form edits; the excluded ids are left out, they change from the queue
type Draft = {
  includeStatic: boolean;
  includeAnimated: boolean;
  skipZeroWidth: boolean;
  skipNsfw: boolean;
  nameContains: string;
  nameRegex: string;
  authorsMode: "block" | "allow";
  authors: string;
  maxAspectRatio: number;
  fitting: Fitting;
};

const toDraft = ({ filters, optimization }: SyncSettings): Draft => ({
  includeStatic: filters.includeStatic,
  includeAnimated: filters.includeAnimated,
  skipZeroWidth: filters.skipZeroWidth,
  skipNsfw: filters.skipNsfw,
  nameContains: filters.nameContains.join(", "),
  nameRegex: filters.nameRegex ?? "",
  authorsMode: filters.authors.mode,
  authors: filters.authors.values.join(", "),
  maxAspectRatio: optimization.maxAspectRatio,
  fitting: optimization.fitting,
});

const toSettings = (draft: Draft, excludedEmoteIds: string[]): SyncSettings => ({
  filters: {
    includeStatic: draft.includeStatic,
    includeAnimated: draft.includeAnimated,
    skipZeroWidth: draft.skipZeroWidth,
    skipNsfw: draft.skipNsfw,
    nameContains: parseList(draft.nameContains),
    nameRegex: draft.nameRegex.trim() || null,
    excludedEmoteIds,
    authors: { mode: draft.authorsMode, values: parseList(draft.authors) },
  },
  optimization: { maxAspectRatio: draft.maxAspectRatio, fitting: draft.fitting },
});

// The fields that matter for "changed", without the excluded ids
const comparable = (settings: SyncSettings) =>
  JSON.stringify({
    ...settings,
    filters: { ...settings.filters, excludedEmoteIds: undefined },
  });

type StvSyncSettingsProps = {
  guildId: string;
  sync: LinkedSync;
  defaults: SyncSettings;
};

/**
 * Filters and optimization for the sync. Saved together with one button; the form
 * starts over whenever the saved settings change.
 */
export function StvSyncSettings(props: StvSyncSettingsProps) {
  return <SettingsForm key={comparable(props.sync.settings)} {...props} />;
}

function SettingsForm({ guildId, sync, defaults }: StvSyncSettingsProps) {
  const saved = sync.settings;
  const [draft, setDraft] = useState(() => toDraft(saved));
  const save = useSaveSyncSettings(guildId);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    save.reset();
  };

  const excluded = saved.filters.excludedEmoteIds;
  const next = toSettings(draft, excluded);
  const changed = comparable(next) !== comparable(saved);
  const isDefault = comparable(next) === comparable(defaults);

  const errors = {
    nameContains: listError(
      next.filters.nameContains,
      SETTINGS_LIMITS.nameContains,
      "words"
    ),
    nameRegex: next.filters.nameRegex
      ? nameRegexError(next.filters.nameRegex)
      : undefined,
    authors: listError(next.filters.authors.values, SETTINGS_LIMITS.authors, "authors"),
  };
  const valid = !Object.values(errors).some(Boolean);

  return (
    <form
      className="flex max-w-2xl flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (changed && valid) save.mutate(next);
      }}
    >
      <Group
        title="filters"
        description="checked when an emote is added on 7TV. an emote a filter catches goes to the queue, where you can still add it"
      >
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Switch
            label="static emotes"
            checked={draft.includeStatic}
            onCheckedChange={(value) => set("includeStatic", value)}
          />
          <Switch
            label="animated emotes"
            checked={draft.includeAnimated}
            onCheckedChange={(value) => set("includeAnimated", value)}
          />
          <Switch
            label="skip zero-width emotes"
            description="made to sit on top of another emote, which Discord can't do"
            checked={draft.skipZeroWidth}
            onCheckedChange={(value) => set("skipZeroWidth", value)}
          />
          <Switch
            label="skip NSFW emotes"
            description="emotes 7TV marks as sexual"
            checked={draft.skipNsfw}
            onCheckedChange={(value) => set("skipNsfw", value)}
          />
        </div>
        {!draft.includeStatic && !draft.includeAnimated && (
          <Text size="sm" className="text-primary">
            with static and animated both off, every new emote goes to the queue
          </Text>
        )}
        <TextField
          label="name contains"
          value={draft.nameContains}
          onValueChange={(value) => set("nameContains", value)}
          placeholder="pepe, cat"
          error={errors.nameContains}
          description="only add emotes whose name contains one of these words, separated by commas. case doesn't matter. empty adds any name"
        />
        <TextField
          label="name pattern"
          value={draft.nameRegex}
          onValueChange={(value) => set("nameRegex", value)}
          prefix="/"
          suffix="/i"
          placeholder="^peepo"
          error={errors.nameRegex}
          description="a regular expression the name has to match. case doesn't matter. empty adds any name"
        />
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-medium text-foreground text-sm">authors</span>
            <SegmentedControl
              aria-label="authors"
              size="sm"
              value={draft.authorsMode}
              onValueChange={(value) =>
                value && set("authorsMode", value as Draft["authorsMode"])
              }
            >
              <SegmentedControlItem value="block">skip these</SegmentedControlItem>
              <SegmentedControlItem value="allow">only these</SegmentedControlItem>
            </SegmentedControl>
          </div>
          <TextField
            label={draft.authorsMode === "block" ? "authors to skip" : "authors to add"}
            hideLabel
            value={draft.authors}
            onValueChange={(value) => set("authors", value)}
            placeholder="7TV usernames or user ids"
            error={errors.authors}
            description={
              draft.authorsMode === "block"
                ? "emotes made by these 7TV users aren't added, separated by commas. empty adds any author"
                : "only emotes made by these 7TV users are added, separated by commas. empty adds any author"
            }
          />
        </div>
        <ExcludedEmotes guildId={guildId} sync={sync} />
      </Group>

      <Group
        title="optimization"
        description="Discord shows emotes in a square, and tetra fits each one under 256 KB"
      >
        <div className="flex flex-col gap-1.5">
          <Slider
            label="max aspect ratio"
            value={draft.maxAspectRatio}
            onValueChange={(value) => set("maxAspectRatio", value)}
            min={SETTINGS_LIMITS.maxAspectRatio.min}
            max={SETTINGS_LIMITS.maxAspectRatio.max}
            step={0.25}
            format={(value) => `${value}:1`}
          />
          <Text size="xs" tone="muted">
            emotes wider or taller than this go to the queue, so you can crop them in the
            editor
          </Text>
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-medium text-foreground text-sm">shape</span>
          <FittingPicker
            value={draft.fitting}
            onValueChange={(value) => set("fitting", value)}
          />
          <Text size="xs" tone="muted">
            {FITTING_HINTS[draft.fitting]}
          </Text>
        </div>
      </Group>

      <div className="flex flex-col gap-3">
        {save.isError && (
          <p role="alert" className="text-danger text-sm">
            {settingsErrorMessage(save.error)}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={!changed || !valid || save.isPending}
          >
            {save.isPending ? "saving" : "save"}
          </Button>
          {changed && (
            <Button
              size="sm"
              variant="ghost"
              disabled={save.isPending}
              onClick={() => {
                setDraft(toDraft(saved));
                save.reset();
              }}
            >
              discard changes
            </Button>
          )}
          {!isDefault && (
            <Button
              size="sm"
              variant="ghost"
              disabled={save.isPending}
              onClick={() => {
                setDraft(toDraft(defaults));
                save.reset();
              }}
            >
              reset to defaults
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

// Core only rejects what the form can't check itself: nested repeats like (a+)+
const settingsErrorMessage = (error: Error) =>
  error instanceof ApiError && error.reference === "INVALID_REQUEST_SCHEMA"
    ? "i can't use that name pattern. nested repeats like (a+)+ could stall the sync, so simplify it"
    : syncErrorMessage(error);

// Cleared on its own, right away: the ids come from dismissing in the queue
function ExcludedEmotes({ guildId, sync }: { guildId: string; sync: LinkedSync }) {
  const clear = useSaveSyncSettings(guildId);
  const count = sync.settings.filters.excludedEmoteIds.length;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-foreground text-sm">excluded emotes</span>
        <span className="text-muted text-xs">
          {count === 0
            ? "none yet. dismiss an emote from the queue with never sync it to add it here"
            : `${count} ${count === 1 ? "emote" : "emotes"} you dismissed for good. the sync skips them without queueing`}
        </span>
        {clear.isError && (
          <span role="alert" className="text-danger text-xs">
            {syncErrorMessage(clear.error)}
          </span>
        )}
      </div>
      {count > 0 && (
        <Button
          size="sm"
          variant="ghost"
          disabled={clear.isPending}
          onClick={() =>
            clear.mutate({
              ...sync.settings,
              filters: { ...sync.settings.filters, excludedEmoteIds: [] },
            })
          }
        >
          {clear.isPending ? "clearing" : "clear"}
        </Button>
      )}
    </div>
  );
}

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-5 border-0 p-0">
      <legend className="mb-5 flex flex-col gap-1 p-0">
        <Heading level={3} size="sm">
          {title}
        </Heading>
        <Text size="sm" tone="muted">
          {description}
        </Text>
      </legend>
      {children}
    </fieldset>
  );
}
