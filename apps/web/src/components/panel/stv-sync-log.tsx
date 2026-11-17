import { useInfiniteQuery } from "@tanstack/react-query";

import { PanelError, PanelLoading } from "@/components/panel/query-state";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
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

/** What the sync did lately, newest first, one dense line per entry. */
export function StvSyncLog({ guildId }: { guildId: string }) {
  const log = useInfiniteQuery(syncLogQueryOptions(guildId));

  if (log.status === "pending") {
    return <PanelLoading>loading the activity</PanelLoading>;
  }
  if (log.status === "error") {
    return (
      <PanelError retrying={log.isFetching} onRetry={() => void log.refetch()}>
        i couldn&apos;t load the activity. {syncErrorMessage(log.error)}
      </PanelError>
    );
  }

  const entries = log.data.pages.flatMap((page) => page.entries);

  if (entries.length === 0) {
    return (
      <Text size="sm" tone="muted">
        nothing yet. what the sync adds, removes or holds back shows up here
      </Text>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col items-start gap-3">
      <Text size="xs" tone="muted">
        the last 30 days, up to 200 entries
      </Text>
      <ol className="m-0 flex w-full list-none flex-col border border-border p-0">
        {entries.map((entry) => (
          <LogRow key={entry.id} entry={entry} />
        ))}
      </ol>
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
