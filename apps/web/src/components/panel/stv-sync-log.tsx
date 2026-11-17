import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { GuildIcon } from "@/components/panel/guild-icon";
import { PanelError, PanelLoading } from "@/components/panel/query-state";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import type { ManagedGuild } from "@/lib/guilds";
import { relativeTime } from "@/lib/relative-time";
import { syncErrorMessage } from "@/lib/stv-sync";
import {
  type SyncLogEntry,
  stvPreviewUrl,
  syncLogAction,
  syncLogQueryOptions,
} from "@/lib/stv-sync-log";

const ACTION_TONE = {
  attention: "text-primary",
  danger: "text-danger",
};

const PREVIEW_ROWS = 5;

/** The activity page: the whole log the API keeps, paged. */
export function StvSyncActivity({ guild }: { guild: ManagedGuild }) {
  return (
    <div className="flex flex-col gap-8 pb-12">
      <header className="flex min-w-0 items-center gap-4">
        <GuildIcon guild={guild} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <Heading level={1} size="lg" className="min-w-0 truncate">
            activity
          </Heading>
          <Link
            to="/panel/servers/$guildId/sync"
            params={{ guildId: guild.id }}
            className="min-w-0 cursor-default truncate font-mono text-muted text-xs no-underline hover:text-foreground"
          >
            ← 7TV sync
          </Link>
        </div>
      </header>
      <StvSyncLog guildId={guild.id} />
    </div>
  );
}

/** What the sync did lately, newest first, one dense line per entry. */
function StvSyncLog({ guildId }: { guildId: string }) {
  const log = useSyncLog(guildId);

  if (log.status !== "success") return <LogState log={log} />;

  const entries = log.data.pages.flatMap((page) => page.entries);

  return (
    <div className="flex max-w-3xl flex-col items-start gap-3">
      <Text size="xs" tone="muted">
        the last 30 days, up to 200 entries
      </Text>
      {entries.length === 0 ? (
        <Text size="sm" tone="muted">
          nothing yet. what the sync adds, removes or holds back shows up here
        </Text>
      ) : (
        <LogList entries={entries} />
      )}
      {log.isFetchNextPageError && (
        <p role="alert" className="m-0 text-danger text-sm">
          i couldn&apos;t load more entries. try again
        </p>
      )}
      {log.hasNextPage && (
        <Button
          size="sm"
          variant="ghost"
          className="-ml-2.5"
          disabled={log.isFetchingNextPage}
          onClick={() => void log.fetchNextPage()}
        >
          {log.isFetchingNextPage ? "loading more" : "load more"}
        </Button>
      )}
    </div>
  );
}

/**
 * The newest few entries on the sync page. The first page of the activity page's query,
 * so following the link shows them at once.
 */
export function StvSyncLogPreview({ guildId }: { guildId: string }) {
  const log = useSyncLog(guildId);

  if (log.status !== "success") return <LogState log={log} />;

  const entries = log.data.pages[0]?.entries.slice(0, PREVIEW_ROWS) ?? [];

  if (entries.length === 0) {
    return (
      <Text size="sm" tone="muted">
        nothing yet
      </Text>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col items-start gap-3">
      <LogList entries={entries} />
      <Button
        size="sm"
        variant="ghost"
        className="-ml-2.5"
        render={<Link to="/panel/servers/$guildId/sync/activity" params={{ guildId }} />}
      >
        see all activity
      </Button>
    </div>
  );
}

type LogQuery = ReturnType<typeof useSyncLog>;

const useSyncLog = (guildId: string) => useInfiniteQuery(syncLogQueryOptions(guildId));

function LogState({ log }: { log: LogQuery }) {
  if (log.status === "pending") {
    return <PanelLoading>loading the activity</PanelLoading>;
  }
  return (
    <PanelError retrying={log.isFetching} onRetry={() => void log.refetch()}>
      i couldn&apos;t load the activity. {syncErrorMessage(log.error)}
    </PanelError>
  );
}

function LogList({ entries }: { entries: SyncLogEntry[] }) {
  return (
    <ol className="m-0 flex w-full list-none flex-col border border-border p-0">
      {entries.map((entry) => (
        <LogRow key={entry.id} entry={entry} />
      ))}
    </ol>
  );
}

function LogRow({ entry }: { entry: SyncLogEntry }) {
  const action = syncLogAction(entry);
  const { emote } = entry;
  const at = new Date(entry.createdAt);

  return (
    <li className="flex items-center gap-3 border-border px-3 py-2 not-last:border-b">
      {emote ? (
        <img
          src={stvPreviewUrl(emote.stvEmoteId)}
          alt=""
          loading="lazy"
          draggable={false}
          className="size-7 shrink-0 bg-checker object-contain p-0.5"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center"
        >
          <span className="size-1.5 bg-neutral-600" />
        </span>
      )}
      <p className="m-0 flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
        {emote && (
          <span
            className={cn(
              "min-w-0 truncate font-mono",
              emote.name ? "text-foreground" : "text-muted"
            )}
          >
            {emote.name ? `:${emote.name}:` : "unnamed emote"}
          </span>
        )}
        <span
          className={cn("min-w-0", action.tone ? ACTION_TONE[action.tone] : "text-muted")}
        >
          {action.text}
        </span>
      </p>
      <time
        dateTime={entry.createdAt}
        title={at.toLocaleString()}
        className="shrink-0 self-start pt-0.5 font-mono text-muted text-xs tabular-nums"
      >
        {relativeTime(at.getTime())}
      </time>
    </li>
  );
}
