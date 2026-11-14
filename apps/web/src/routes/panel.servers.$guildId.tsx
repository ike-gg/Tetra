import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState } from "react";

import { EmoteGrid } from "@/components/emote/emote-grid";
import { EmoteMenu } from "@/components/emote/emote-menu";
import { GuildIcon } from "@/components/panel/guild-icon";
import { GuildsError } from "@/components/panel/guilds-error";
import { PanelError, PanelLoading } from "@/components/panel/query-state";
import { QuickAdd } from "@/components/panel/quick-add";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { SlotMeter } from "@/components/ui/slot-meter";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { ApiError } from "@/lib/api";
import {
  compareSnowflakes,
  fromGuildEmote,
  fromRemovedEmote,
  type PanelEmote,
} from "@/lib/emote";
import { useRestoringKeys } from "@/lib/emote-mutations";
import {
  guildQueryOptions,
  guildsQueryOptions,
  type ManagedGuild,
  removedEmotesQueryOptions,
} from "@/lib/guilds";

type ServerSearch = { view?: "removed" };

export const Route = createFileRoute("/panel/servers/$guildId")({
  validateSearch: (search: Record<string, unknown>): ServerSearch =>
    search.view === "removed" ? { view: "removed" } : {},
  component: PanelServer,
});

function PanelServer() {
  const { guildId } = Route.useParams();
  const guilds = useQuery(guildsQueryOptions);

  if (guilds.status === "pending")
    return <PanelLoading>loading the server…</PanelLoading>;

  if (guilds.status === "error") {
    return (
      <GuildsError
        error={guilds.error}
        retrying={guilds.isFetching}
        onRetry={() => void guilds.refetch()}
      />
    );
  }

  const guild = guilds.data.guildsWithUserPermissions.find(({ id }) => id === guildId);
  // Keyed so a switch to another server starts with fresh filters
  if (guild) return <Server key={guild.id} guild={guild} />;

  const readOnly = guilds.data.guildsWithBot.find(({ id }) => id === guildId);
  return (
    <div className="flex max-w-lg flex-col items-start gap-4">
      <Heading level={1} size="lg">
        {readOnly ? `You can't manage emotes on ${readOnly.name}` : "Server not found"}
      </Heading>
      <Text size="sm" tone="muted">
        {readOnly
          ? "Tetra is there, but you need the Manage Expressions permission on that server."
          : "Tetra isn't on this server, or you're not a member of it. Check the link, or pick a server from the list."}
      </Text>
      <Button size="sm" render={<Link to="/panel" />}>
        Back to Home
      </Button>
    </div>
  );
}

type TypeFilter = "all" | "static" | "animated";
type Sort = "newest" | "name";

const LEVELS = ["No boost", "Boost level 1", "Boost level 2", "Boost level 3"];

function Server({ guild }: { guild: ManagedGuild }) {
  const { view } = Route.useSearch();
  const navigate = Route.useNavigate();
  const details = useQuery(guildQueryOptions(guild.id));
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  // Slot counts from the live server once loaded, from the servers list until then
  const stats = details.data?.stats;
  const limit = stats?.static.limit ?? guild.emojis.limit;
  const staticUsed = stats?.static.used ?? guild.emojis.static;
  const animatedUsed = stats?.animated.used ?? guild.emojis.animated;
  const emotes = details.data?.emotes;
  const managed = emotes?.filter((emote) => emote.managed).length ?? 0;

  const filters = { query, type, sort };
  const target = { id: guild.id, name: guild.name };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <GuildIcon guild={guild} size="lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <Heading level={1} size="lg" className="min-w-0 truncate">
              {guild.name}
            </Heading>
            <p className="font-mono text-muted text-xs">
              {details.data ? LEVELS[details.data.level] : "…"}
              {emotes &&
                ` · ${emotes.length} ${emotes.length === 1 ? "emote" : "emotes"}`}
              {managed > 0 && ` · ${managed} managed`}
            </p>
          </div>
          <Button
            size="sm"
            className="ml-auto shrink-0"
            render={<Link to="/panel/browse" search={{ guild: guild.id }} />}
          >
            Browse emotes
          </Button>
        </div>
        <div className="grid max-w-md grid-cols-2 gap-6 border border-border p-4">
          <SlotMeter label="static" used={staticUsed} limit={limit} />
          <SlotMeter label="animated" used={animatedUsed} limit={limit} />
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <QuickAdd
          compact
          defaultGuildId={guild.id}
          placeholder={`Paste an emote link to add it to ${guild.name}`}
          className="max-w-xl"
        />
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            aria-label="Show"
            value={view ?? "emotes"}
            onValueChange={(next) =>
              next &&
              void navigate({
                search: next === "removed" ? { view: "removed" } : {},
                replace: true,
              })
            }
          >
            <SegmentedControlItem value="emotes">Emotes</SegmentedControlItem>
            <SegmentedControlItem value="removed">Removed</SegmentedControlItem>
          </SegmentedControl>
          <TextField
            label="Search by name"
            hideLabel
            value={query}
            onValueChange={setQuery}
            placeholder="Search by name"
            className="min-w-40 flex-1 sm:max-w-64"
          />
          <SegmentedControl
            aria-label="Type"
            value={type}
            onValueChange={(next) => next && setType(next as TypeFilter)}
          >
            <SegmentedControlItem value="all">All</SegmentedControlItem>
            <SegmentedControlItem value="static">Static</SegmentedControlItem>
            <SegmentedControlItem value="animated">Animated</SegmentedControlItem>
          </SegmentedControl>
          <SegmentedControl
            aria-label="Sort"
            value={sort}
            onValueChange={(next) => next && setSort(next as Sort)}
          >
            <SegmentedControlItem value="newest">Newest</SegmentedControlItem>
            <SegmentedControlItem value="name">A–Z</SegmentedControlItem>
          </SegmentedControl>
        </div>

        <EmoteMenu
          kind={view === "removed" ? "removed" : "server"}
          guild={target}
          canManage
        >
          {view === "removed" ? (
            <RemovedEmotes
              guildId={guild.id}
              filters={filters}
              onClear={() => setQuery("")}
            />
          ) : details.status === "pending" ? (
            <PanelLoading>loading emotes…</PanelLoading>
          ) : details.status === "error" ? (
            <PanelError
              retrying={details.isFetching}
              onRetry={() => void details.refetch()}
            >
              {guildErrorMessage(details.error)}
            </PanelError>
          ) : (
            <ServerEmotes
              emotes={details.data.emotes.map(fromGuildEmote)}
              filters={filters}
              onClear={() => setQuery("")}
            />
          )}
        </EmoteMenu>
      </div>
    </div>
  );
}

const guildErrorMessage = (error: Error) => {
  if (error instanceof ApiError && error.status === 404) {
    return "Tetra couldn't open this server on Discord. It may have been removed from it.";
  }
  return "Couldn't load this server's emotes.";
};

type Filters = { query: string; type: TypeFilter; sort: Sort };

// Instant, client-side: even 500 emotes filter in well under a frame
function useFiltered(emotes: PanelEmote[], { query, type, sort }: Filters) {
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  return useMemo(() => {
    const filtered = emotes.filter(
      (emote) =>
        (type === "all" || emote.animated === (type === "animated")) &&
        (!deferredQuery || emote.name.toLowerCase().includes(deferredQuery))
    );
    return sort === "name"
      ? filtered.sort((a, b) => a.name.localeCompare(b.name))
      : filtered.sort((a, b) =>
          a.restoreId !== undefined && b.restoreId !== undefined
            ? b.restoreId - a.restoreId
            : compareSnowflakes(b.id, a.id)
        );
  }, [emotes, deferredQuery, type, sort]);
}

type ListProps = { filters: Filters; onClear: () => void };

function ServerEmotes({
  emotes,
  filters,
  onClear,
}: ListProps & { emotes: PanelEmote[] }) {
  const visible = useFiltered(emotes, filters);

  if (emotes.length === 0) {
    return (
      <EmptyState title="No emotes yet">
        Add one with <span className="font-mono text-foreground">/addemote</span> in
        Discord, or right-click an emote anywhere in the panel and pick Add to server.
      </EmptyState>
    );
  }
  if (visible.length === 0) return <NoMatches filters={filters} onClear={onClear} />;
  return <EmoteGrid emotes={visible} label="Emotes" />;
}

function RemovedEmotes({ guildId, filters, onClear }: ListProps & { guildId: string }) {
  const removed = useQuery(removedEmotesQueryOptions(guildId));
  const restoring = useRestoringKeys(guildId);
  const emotes = useMemo(
    () => removed.data?.map((emote) => fromRemovedEmote(emote, guildId)) ?? [],
    [removed.data, guildId]
  );
  const visible = useFiltered(emotes, filters);
  const pendingKeys = useMemo(
    () => new Set(restoring.filter((key) => key !== undefined)),
    [restoring]
  );

  if (removed.status === "pending")
    return <PanelLoading>loading removed emotes…</PanelLoading>;
  if (removed.status === "error") {
    return (
      <PanelError retrying={removed.isFetching} onRetry={() => void removed.refetch()}>
        Couldn&apos;t load the removed emotes.
      </PanelError>
    );
  }
  if (emotes.length === 0) {
    return (
      <EmptyState title="Nothing to restore">
        Emotes removed with Tetra show up here, so you can put them back.
      </EmptyState>
    );
  }
  if (visible.length === 0) return <NoMatches filters={filters} onClear={onClear} />;
  return (
    <div className="flex flex-col gap-3">
      <Text size="sm" tone="muted">
        Right-click an emote, or press Shift+F10, to restore it.
      </Text>
      <EmoteGrid emotes={visible} label="Removed emotes" pendingKeys={pendingKeys} />
    </div>
  );
}

function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex max-w-lg flex-col items-start gap-2 border border-border p-6">
      <Heading level={2} size="sm">
        {title}
      </Heading>
      <Text size="sm" tone="muted">
        {children}
      </Text>
    </div>
  );
}

function NoMatches({ filters, onClear }: ListProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      <Text size="sm" tone="muted">
        {filters.query.trim()
          ? `Nothing matches “${filters.query.trim()}”${filters.type === "all" ? "" : ` among ${filters.type} emotes`}.`
          : `No ${filters.type} emotes here.`}
      </Text>
      {filters.query && (
        <Button size="sm" onClick={onClear}>
          Clear search
        </Button>
      )}
    </div>
  );
}
