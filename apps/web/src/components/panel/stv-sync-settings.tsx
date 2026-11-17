import type { ReactNode } from "react";

import { StvSyncRules } from "@/components/panel/stv-sync-rules";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import {
  type LinkedSync,
  MAX_ASPECT_RATIO,
  type SyncSettings,
  syncErrorMessage,
} from "@/lib/stv-sync";
import { useSaveSyncSettings } from "@/lib/stv-sync-mutations";
import {
  type SettingsDraft,
  type SettingsForm,
  toSettingsDraft,
} from "@/lib/stv-sync-settings-draft";

type StvSyncSettingsProps = {
  guildId: string;
  sync: LinkedSync;
  defaults: SyncSettings;
  form: SettingsForm;
};

/**
 * Filters, rules and optimization, edited as one draft and saved from the save bar; the
 * never sync list next to them is cleared on its own.
 */
export function StvSyncSettings({ guildId, sync, defaults, form }: StvSyncSettingsProps) {
  const { draft, setDraft } = form;
  const setFilter = (key: keyof SettingsDraft["filters"], value: boolean) =>
    setDraft((previous) => ({
      ...previous,
      filters: { ...previous.filters, [key]: value },
    }));

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <form
        className="flex flex-col gap-10"
        onSubmit={(event) => {
          event.preventDefault();
          form.save();
        }}
      >
        <Group
          title="filters"
          description="checked first when an emote is added on 7TV. an emote a filter catches needs review, where you can still add it"
        >
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Switch
              label="static emotes"
              checked={draft.filters.includeStatic}
              onCheckedChange={(value) => setFilter("includeStatic", value)}
            />
            <Switch
              label="animated emotes"
              checked={draft.filters.includeAnimated}
              onCheckedChange={(value) => setFilter("includeAnimated", value)}
            />
            <Switch
              label="skip zero-width emotes"
              description="made to sit on top of another emote, which Discord can't do"
              checked={draft.filters.skipZeroWidth}
              onCheckedChange={(value) => setFilter("skipZeroWidth", value)}
            />
            <Switch
              label="skip sensitive emotes"
              description="emotes 7TV marks as sensitive"
              checked={draft.filters.skipNsfw}
              onCheckedChange={(value) => setFilter("skipNsfw", value)}
            />
          </div>
          {!draft.filters.includeStatic && !draft.filters.includeAnimated && (
            <Text size="sm" className="text-primary">
              with static and animated both off, every new emote needs review
            </Text>
          )}
        </Group>

        <Group
          title="advanced filters"
          description="your own rules for what to hold back, skip or add, after the filters above"
        >
          <StvSyncRules
            rules={draft.rules}
            errors={form.errors}
            defaults={defaults.advancedRules}
            onChange={(update) =>
              setDraft((previous) => ({ ...previous, rules: update(previous.rules) }))
            }
          />
        </Group>

        <Group
          title="optimization"
          description="Discord shows emotes in a square, and tetra fits each one under 256 KB, keeping the whole emote visible"
        >
          <div className="flex max-w-md flex-col gap-1.5">
            <Slider
              label="max aspect ratio"
              value={draft.maxAspectRatio}
              onValueChange={(value) =>
                setDraft((previous) => ({
                  ...previous,
                  maxAspectRatio: Math.round(value * 10) / 10,
                }))
              }
              min={MAX_ASPECT_RATIO.min}
              max={MAX_ASPECT_RATIO.max}
              step={MAX_ASPECT_RATIO.step}
              format={(value) => `${value.toFixed(1)}:1`}
            />
            <Text size="xs" tone="muted">
              emotes wider or taller than this need review, so you can crop them in the
              editor. they&apos;d look tiny in a square
            </Text>
          </div>
        </Group>
      </form>

      <NeverSync guildId={guildId} sync={sync} />

      {!form.isDefault(defaults) && (
        <div>
          <Button
            size="sm"
            variant="ghost"
            className="-ml-2.5"
            onClick={() => setDraft(() => toSettingsDraft(defaults))}
          >
            reset all settings to defaults
          </Button>
        </div>
      )}
    </div>
  );
}

// Cleared on its own, right away: the ids come from dismissing in needs review
function NeverSync({ guildId, sync }: { guildId: string; sync: LinkedSync }) {
  const clear = useSaveSyncSettings(guildId, "cleared the never sync list");
  const count = sync.settings.excludedEmoteIds.length;

  return (
    <section aria-labelledby="sync-never" className="flex flex-col gap-3">
      <Heading id="sync-never" level={3} size="sm">
        never sync
      </Heading>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-foreground text-sm">
            {count === 0
              ? "no emotes yet"
              : `${count} ${count === 1 ? "emote" : "emotes"}`}
          </span>
          <span className="text-muted text-xs">
            {count === 0
              ? "dismiss an emote in needs review with never sync it to add it here"
              : "you dismissed these for good. the sync skips them without asking"}
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
            onClick={() => clear.mutate({ ...sync.settings, excludedEmoteIds: [] })}
          >
            {clear.isPending ? "clearing" : "clear"}
          </Button>
        )}
      </div>
    </section>
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
    <fieldset className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0">
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
