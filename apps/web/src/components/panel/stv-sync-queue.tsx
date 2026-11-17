import { useQuery } from "@tanstack/react-query";

import { PanelError, PanelLoading } from "@/components/panel/query-state";
import { Button, buttonClassName } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu";
import { Text } from "@/components/ui/text";
import { relativeTime } from "@/lib/relative-time";
import { type QueueEntry, syncQueueQueryOptions } from "@/lib/stv-sync";
import {
  useDismissQueueEntry,
  useOpenQueueEntryInEditor,
  useRetryQueueEntry,
} from "@/lib/stv-sync-mutations";

type Guild = { id: string; name: string };

/** Emotes the sync couldn't add, newest first, each with its reason and what to do. */
export function StvSyncQueue({ guild }: { guild: Guild }) {
  const queue = useQuery(syncQueueQueryOptions(guild.id));

  if (queue.status === "pending") return <PanelLoading>loading the queue</PanelLoading>;
  if (queue.status === "error") {
    return (
      <PanelError retrying={queue.isFetching} onRetry={() => void queue.refetch()}>
        i couldn&apos;t load the queue
      </PanelError>
    );
  }

  if (queue.data.length === 0) {
    return (
      <div className="flex max-w-lg flex-col items-start gap-2 border border-border p-6">
        <Heading level={3} size="sm">
          the queue is empty
        </Heading>
        <Text size="sm" tone="muted">
          emotes tetra couldn&apos;t add show up here with the reason, so you can retry,
          fix them in the editor or let them go
        </Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Text size="sm" tone="muted" className="max-w-2xl">
        a freed slot doesn&apos;t add anything on its own. make room, then retry. retry
        skips the filters, since you picked the emote
      </Text>
      <ul className="m-0 flex list-none flex-col border border-border p-0">
        {queue.data.map((entry) => (
          <QueueRow key={entry.id} guild={guild} entry={entry} />
        ))}
      </ul>
    </div>
  );
}

function QueueRow({ guild, entry }: { guild: Guild; entry: QueueEntry }) {
  const retry = useRetryQueueEntry(guild);
  const dismiss = useDismissQueueEntry(guild.id);
  const openInEditor = useOpenQueueEntryInEditor(guild.id);
  const busy = retry.isPending || dismiss.isPending;
  const label = `:${entry.discordName}:`;

  const meta = [
    entry.animated ? "animated" : "static",
    entry.width && entry.height ? `${entry.width}×${entry.height}` : null,
    entry.author ? `by ${entry.author}` : null,
    relativeTime(Date.parse(entry.queuedAt)),
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-3 border-border p-4 not-last:border-b sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <img
          src={entry.previewUrl}
          alt=""
          loading="lazy"
          draggable={false}
          className="size-14 shrink-0 bg-checker object-contain p-1"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="m-0 flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="truncate font-medium font-mono text-foreground text-sm">
              {label}
            </span>
            {entry.name !== entry.discordName && (
              <span className="truncate font-mono text-muted text-xs">
                {entry.name} on 7TV
              </span>
            )}
          </p>
          <p className="m-0 font-mono text-muted text-xs">{meta.join(" · ")}</p>
          <p className="m-0 text-foreground text-sm">{entry.message}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 max-sm:pl-18">
        <Button
          size="sm"
          disabled={busy}
          aria-label={`retry ${label}`}
          onClick={() => retry.mutate(entry)}
        >
          {retry.isPending ? "retrying" : "retry"}
        </Button>
        <Button
          size="sm"
          disabled={busy}
          aria-label={`open ${label} in the editor`}
          onClick={() => void openInEditor(entry)}
        >
          open in editor
        </Button>
        <Menu
          onAction={(value) => dismiss.mutate({ entry, exclude: value === "exclude" })}
        >
          <MenuTrigger
            disabled={busy}
            aria-label={`dismiss ${label}`}
            className={buttonClassName({
              variant: "ghost",
              size: "sm",
              className: "data-open:bg-surface data-open:text-foreground",
            })}
          >
            {dismiss.isPending ? (
              "dismissing"
            ) : (
              <>
                dismiss
                <span aria-hidden="true" className="font-mono text-xs opacity-60">
                  ▾
                </span>
              </>
            )}
          </MenuTrigger>
          <MenuContent side="bottom" align="end">
            <MenuItem value="dismiss">dismiss</MenuItem>
            <MenuItem value="exclude">dismiss and never sync it</MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </li>
  );
}
