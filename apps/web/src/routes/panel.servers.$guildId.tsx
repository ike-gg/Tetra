import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState } from "react";

import { EmoteGrid } from "@/components/emote/emote-grid";
import { EmoteMenu } from "@/components/emote/emote-menu";
import { GuildIcon } from "@/components/panel/guild-icon";
import { GuildsError } from "@/components/panel/guilds-error";
import { PanelError, PanelLoading } from "@/components/panel/query-state";
import { QuickAdd } from "@/components/panel/quick-add";
import { SimilarEmotes } from "@/components/panel/similar-emotes";
import { StvSyncTile } from "@/components/panel/stv-sync";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Notice } from "@/components/ui/notice";
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
import { RETENTION_DAYS } from "@/lib/retention";
import { NOINDEX_META } from "@/lib/seo";

type ServerSearch = { view?: "removed" | "similar" };

export const Route = createFileRoute("/panel/servers/$guildId")({
  head: () => ({ meta: [NOINDEX_META] }),
  validateSearch: (search: Record<string, unknown>): ServerSearch =>
    search.view === "removed" || search.view === "similar" ? { view: search.view } : {},
  component: PanelServer,
});

function PanelServer() {
  const { guildId } = Route.useParams();
  const guilds = useQuery(guildsQueryOptions);

  if (guilds.status === "pending") return <PanelLoading>loading the server</PanelLoading>;

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
  if (guild) return <Server key={guild.id} guild={guild} canManage />;

  // tetra is there but the user lacks manage expressions: browsing only, core still
  // answers 403 to any write
  const viewOnly = guilds.data.guildsWithBot.find(({ id }) => id === guildId);
  if (viewOnly) return <Server key={viewOnly.id} guild={viewOnly} canManage={false} />;

  return (
    <div className="flex max-w-lg flex-col items-start gap-4">
      <Heading level={1} size="lg">
        server not found
      </Heading>
      <Text size="sm" tone="muted">
        tetra isn&apos;t on this server, or you&apos;re not a member of it. check the
        link, or pick a server from the list
      </Text>
      <Button size="sm" render={<Link to="/panel" />}>
        back to home
      </Button>
    </div>
  );
}

type TypeFilter = "all" | "static" | "animated";
type Sort = "newest" | "name";

const LEVELS = ["no boost", "boost level 1", "boost level 2", "boost level 3"];

function Server({ guild, canManage }: { guild: ManagedGuild; canManage: boolean }) {
  const search = Route.useSearch();
  // Removed emotes and similar names are for cleaning up, which needs manage expressions
  const view = canManage ? search.view : undefined;
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
            <p className="flex flex-wrap items-center gap-x-2 font-mono text-muted text-xs">
              <span>
                {details.data ? LEVELS[details.data.level] : "…"}
                {emotes &&
                  ` · ${emotes.length} ${emotes.length === 1 ? "emote" : "emotes"}`}
                {managed > 0 && ` · ${managed} managed`}
              </span>
              {!canManage && <Badge>view only</Badge>}
            </p>
          </div>
          {canManage && (
            <Button
              size="sm"
              className="ml-auto shrink-0"
              render={<Link to="/panel/browse" search={{ guild: guild.id }} />}
            >
              browse emotes
            </Button>
          )}
        </div>
        {!canManage && (
          <Text size="sm" tone="muted" className="max-w-xl">
            you can browse, download and copy these emotes, or add them to a server you
            manage. to add or remove emotes here, you need the manage expressions
            permission on {guild.name}
          </Text>
        )}
        <div className="flex flex-wrap gap-4">
          <div className="grid w-full max-w-md grid-cols-2 gap-6 border border-border p-4">
            <SlotMeter label="static" used={staticUsed} limit={limit} />
            <SlotMeter label="animated" used={animatedUsed} limit={limit} />
          </div>
          {canManage && <StvSyncTile guildId={guild.id} />}
        </div>
      </header>

      {/* Adding and filtering are separate sections with their own headings: one input
          right above the other read as a single search over this server's emotes */}
      {canManage && (
        <section aria-labelledby="server-add" className="flex flex-col gap-3">
          <Heading id="server-add" level={2} size="sm">
            add an emote
          </Heading>
          <QuickAdd
            compact
            defaultGuildId={guild.id}
            placeholder={`search 7TV or paste a link to add to ${guild.name}`}
            className="max-w-xl"
          />
        </section>
      )}

      <section
        aria-labelledby="server-emotes"
        className="flex flex-col gap-4 border-border border-t pt-8"
      >
        <Heading id="server-emotes" level={2} size="sm">
          emotes on this server
        </Heading>
        <div className="flex flex-wrap items-center gap-3">
          {canManage && (
            <SegmentedControl
              aria-label="show"
              value={view ?? "emotes"}
              onValueChange={(next) =>
                next &&
                void navigate({
                  search: next === "removed" || next === "similar" ? { view: next } : {},
                  replace: true,
                })
              }
            >
              <SegmentedControlItem value="emotes">emotes</SegmentedControlItem>
              <SegmentedControlItem value="removed">removed</SegmentedControlItem>
              <SegmentedControlItem value="similar">similar names</SegmentedControlItem>
            </SegmentedControl>
          )}
          <TextField
            label="filter by name"
            hideLabel
            value={query}
            onValueChange={setQuery}
            placeholder="filter by name"
            className="min-w-40 flex-1 sm:max-w-64"
          />
          <SegmentedControl
            aria-label="type"
            value={type}
            onValueChange={(next) => next && setType(next as TypeFilter)}
          >
            <SegmentedControlItem value="all">all</SegmentedControlItem>
            <SegmentedControlItem value="static">static</SegmentedControlItem>
            <SegmentedControlItem value="animated">animated</SegmentedControlItem>
          </SegmentedControl>
          {/* Groups keep their own order: strongest likeness first */}
          {view !== "similar" && (
            <SegmentedControl
              aria-label="sort"
              value={sort}
              onValueChange={(next) => next && setSort(next as Sort)}
            >
              <SegmentedControlItem value="newest">newest</SegmentedControlItem>
              <SegmentedControlItem value="name">A–Z</SegmentedControlItem>
            </SegmentedControl>
          )}
        </div>

        <EmoteMenu
          kind={view === "removed" ? "removed" : "server"}
          guild={target}
          canManage={canManage}
        >
          {view === "removed" ? (
            <div className="flex flex-col gap-4">
              <RemovedNotice />
              <RemovedEmotes
                guildId={guild.id}
                filters={filters}
                onClear={() => setQuery("")}
              />
            </div>
          ) : details.status === "pending" ? (
            <PanelLoading>loading emotes</PanelLoading>
          ) : details.status === "error" ? (
            <PanelError
              retrying={details.isFetching}
              onRetry={() => void details.refetch()}
            >
              {guildErrorMessage(details.error)}
            </PanelError>
          ) : view === "similar" ? (
            <SimilarEmotes
              guild={target}
              emotes={details.data.emotes.map(fromGuildEmote)}
              query={query}
              type={type}
            />
          ) : (
            <ServerEmotes
              emotes={details.data.emotes.map(fromGuildEmote)}
              filters={filters}
              canManage={canManage}
              onClear={() => setQuery("")}
            />
          )}
        </EmoteMenu>
      </section>
    </div>
  );
}

// Shown in every state of the Removed view: Discord itself keeps nothing, so people
// shouldn't expect emotes from before tetra joined
function RemovedNotice() {
  return (
    <Notice title="removed emotes are a tetra feature" className="max-w-2xl">
      Discord doesn&apos;t keep removed emotes. tetra saves every emote removed while
      it&apos;s on this server, from the panel or in Discord, and keeps it for{" "}
      {RETENTION_DAYS} days so you can restore it. emotes removed before tetra joined
      aren&apos;t here
    </Notice>
  );
}

const guildErrorMessage = (error: Error) => {
  if (error instanceof ApiError && error.status === 404) {
    return "i couldn't open this server on Discord. tetra may have been removed from it";
  }
  return "i couldn't load this server's emotes";
};

type Filters = { query: string; type: TypeFilter; sort: Sort };

// Instant, client-side: even 500 emotes filter in well under a frame. `serverOrder`
// keeps the API's order for "newest" (removed emotes come newest removal first).
function useFiltered(
  emotes: PanelEmote[],
  { query, type, sort }: Filters,
  serverOrder = false
) {
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  return useMemo(() => {
    const filtered = emotes.filter(
      (emote) =>
        (type === "all" || emote.animated === (type === "animated")) &&
        (!deferredQuery || emote.name.toLowerCase().includes(deferredQuery))
    );
    if (sort === "name") return filtered.sort((a, b) => a.name.localeCompare(b.name));
    if (serverOrder) return filtered;
    return filtered.sort((a, b) => compareSnowflakes(b.id, a.id));
  }, [emotes, deferredQuery, type, sort, serverOrder]);
}

type ListProps = { filters: Filters; onClear: () => void };

function ServerEmotes({
  emotes,
  filters,
  canManage,
  onClear,
}: ListProps & { emotes: PanelEmote[]; canManage: boolean }) {
  const visible = useFiltered(emotes, filters);

  if (emotes.length === 0) {
    return (
      <EmptyState title="no emotes yet">
        {canManage ? (
          <>
            add one with <span className="font-mono text-foreground">/addemote</span> in
            Discord, or select an emote anywhere in the panel and pick add to server
          </>
        ) : (
          "this server has no custom emotes"
        )}
      </EmptyState>
    );
  }
  if (visible.length === 0) return <NoMatches filters={filters} onClear={onClear} />;
  return <EmoteGrid emotes={visible} label="emotes" />;
}

function RemovedEmotes({ guildId, filters, onClear }: ListProps & { guildId: string }) {
  const removed = useQuery(removedEmotesQueryOptions(guildId));
  const restoring = useRestoringKeys(guildId);
  const emotes = useMemo(
    () => removed.data?.map((emote) => fromRemovedEmote(emote, guildId)) ?? [],
    [removed.data, guildId]
  );
  const visible = useFiltered(emotes, filters, true);
  const pendingKeys = useMemo(
    () => new Set(restoring.filter((key) => key !== undefined)),
    [restoring]
  );

  if (removed.status === "pending")
    return <PanelLoading>loading removed emotes</PanelLoading>;
  if (removed.status === "error") {
    return (
      <PanelError retrying={removed.isFetching} onRetry={() => void removed.refetch()}>
        i couldn&apos;t load the removed emotes
      </PanelError>
    );
  }
  if (emotes.length === 0) {
    return (
      <EmptyState title="nothing to restore">
        no emote was removed from this server in the last {RETENTION_DAYS} days while
        tetra was on it
      </EmptyState>
    );
  }
  if (visible.length === 0) return <NoMatches filters={filters} onClear={onClear} />;
  return (
    <div className="flex flex-col gap-3">
      <Text size="sm" tone="muted">
        select an emote to restore it, or right-click it
      </Text>
      <EmoteGrid emotes={visible} label="removed emotes" pendingKeys={pendingKeys} />
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
          ? `nothing matches “${filters.query.trim()}”${filters.type === "all" ? "" : ` among ${filters.type} emotes`}`
          : `no ${filters.type} emotes here`}
      </Text>
      {filters.query && (
        <Button size="sm" onClick={onClear}>
          clear search
        </Button>
      )}
    </div>
  );
}
