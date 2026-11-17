import { useDeferredValue, useId, useMemo, useState } from "react";

import { EmoteGrid } from "@/components/emote/emote-grid";
import { EmoteMenu } from "@/components/emote/emote-menu";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import type { PanelEmote } from "@/lib/emote";
import {
  findSimilarEmoteGroups,
  type SimilarGroup,
  similarGroupDismissKey,
} from "@/lib/similar-emotes";

const storageKey = (guildId: string) => `tetra:similar-dismissed:${guildId}`;

// Storage can be missing or throw (private mode, blocked site data): nothing is
// dismissed then, and dismissing lasts until the page closes
const loadDismissed = (guildId: string): Set<string> => {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey(guildId)) ?? "[]");
    return new Set(
      Array.isArray(stored) ? stored.filter((key) => typeof key === "string") : []
    );
  } catch {
    return new Set();
  }
};

const saveDismissed = (guildId: string, dismissed: Set<string>) => {
  try {
    if (dismissed.size > 0) {
      localStorage.setItem(storageKey(guildId), JSON.stringify([...dismissed]));
    } else localStorage.removeItem(storageKey(guildId));
  } catch {
    // Kept in memory for this visit
  }
};

type SimilarEmotesProps = {
  guild: { id: string; name: string };
  emotes: PanelEmote[];
  query: string;
  type: "all" | "static" | "animated";
};

/**
 * The server's emotes grouped by names that look alike (`lib/similar-emotes.ts`), each
 * group with its own emote list, so an emote can be removed right there. Dismissed
 * groups are remembered in this browser per server.
 */
export function SimilarEmotes({ guild, emotes, query, type }: SimilarEmotesProps) {
  const [dismissed, setDismissed] = useState(() => loadDismissed(guild.id));
  const [showDismissed, setShowDismissed] = useState(false);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const typed = useMemo(
    () =>
      type === "all"
        ? emotes
        : emotes.filter((emote) => emote.animated === (type === "animated")),
    [emotes, type]
  );
  // The route maps emotes on every render; names and ids are what grouping depends on
  const signature = typed.map(({ id, name }) => `${id}:${name}`).join("\n");
  // biome-ignore lint/correctness/useExhaustiveDependencies: signature stands for typed
  const groups = useMemo(
    () => findSimilarEmoteGroups(typed.map(({ id, name }) => ({ id, name }))),
    [signature]
  );
  const byId = useMemo(() => new Map(typed.map((emote) => [emote.id, emote])), [typed]);

  const toggle = (group: SimilarGroup) => {
    const key = similarGroupDismissKey(group);
    const next = new Set(dismissed);
    if (!next.delete(key)) next.add(key);
    setDismissed(next);
    saveDismissed(guild.id, next);
  };

  const matching = groups.filter(
    (group) =>
      !deferredQuery ||
      group.emoteIds.some((id) =>
        byId.get(id)?.name.toLowerCase().includes(deferredQuery)
      )
  );
  const hiddenCount = matching.filter((group) =>
    dismissed.has(similarGroupDismissKey(group))
  ).length;
  const shown = showDismissed
    ? matching
    : matching.filter((group) => !dismissed.has(similarGroupDismissKey(group)));
  const typeLabel = type === "all" ? "" : `${type} `;

  if (groups.length === 0) {
    return (
      <Empty title="no similar names">
        none of the {typed.length} {typeLabel}emotes here have names that look alike
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <Text size="sm" tone="muted" className="max-w-xl">
          {typeLabel}emotes grouped by names that look alike. select an emote to remove
          it, or dismiss a group that&apos;s fine as it is
        </Text>
        {hiddenCount > 0 && (
          <Switch
            label="show dismissed"
            description={`${hiddenCount} ${hiddenCount === 1 ? "group" : "groups"} hidden`}
            checked={showDismissed}
            onCheckedChange={setShowDismissed}
            className="w-56"
          />
        )}
      </div>

      {matching.length === 0 ? (
        <Text size="sm" tone="muted">
          no group has an emote matching “{query.trim()}”
        </Text>
      ) : shown.length === 0 ? (
        <Empty title="nothing left to check">
          you dismissed every group here. turn on show dismissed to see them again
        </Empty>
      ) : (
        shown.map((group) => {
          const members = group.emoteIds.flatMap((id) => byId.get(id) ?? []);
          return (
            <SimilarGroupSection
              key={similarGroupDismissKey(group)}
              group={group}
              guild={guild}
              emotes={members}
              dismissed={dismissed.has(similarGroupDismissKey(group))}
              onToggle={() => toggle(group)}
            />
          );
        })
      )}
    </div>
  );
}

type SimilarGroupSectionProps = {
  group: SimilarGroup;
  guild: { id: string; name: string };
  emotes: PanelEmote[];
  dismissed: boolean;
  onToggle: () => void;
};

// Each group gets its own menu: a menu's selection follows one list, so lists can't
// share one (see web/emote.md)
function SimilarGroupSection({
  group,
  guild,
  emotes,
  dismissed,
  onToggle,
}: SimilarGroupSectionProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 border border-border p-4"
    >
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <Heading
            id={headingId}
            level={3}
            size="sm"
            className="truncate font-mono text-base"
          >
            {group.title}
          </Heading>
          <Text size="sm" tone="muted">
            {group.reason} · {emotes.length} emotes
            {dismissed && " · dismissed"}
          </Text>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto shrink-0"
          aria-label={`${dismissed ? "show again" : "dismiss"} ${group.title}`}
          onClick={onToggle}
        >
          {dismissed ? "show again" : "dismiss"}
        </Button>
      </div>
      <EmoteMenu kind="server" guild={guild} canManage>
        <EmoteGrid emotes={emotes} label={`${group.title}, ${group.reason}`} />
      </EmoteMenu>
    </section>
  );
}

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex max-w-lg flex-col items-start gap-2 border border-border p-6">
      <Heading level={3} size="sm">
        {title}
      </Heading>
      <Text size="sm" tone="muted">
        {children}
      </Text>
    </div>
  );
}
