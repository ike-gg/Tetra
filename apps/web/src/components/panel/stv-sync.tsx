import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ChannelSearch } from "@/components/panel/channel-search";
import { GuildIcon } from "@/components/panel/guild-icon";
import { PanelError, PanelLoading } from "@/components/panel/query-state";
import { StvSyncQueue } from "@/components/panel/stv-sync-queue";
import { StvSyncSettings } from "@/components/panel/stv-sync-settings";
import { UnlinkSyncDialog } from "@/components/panel/unlink-sync-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Notice } from "@/components/ui/notice";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import type { ManagedGuild } from "@/lib/guilds";
import { relativeTime } from "@/lib/relative-time";
import {
  connectionStatus,
  type LinkedSync,
  type SyncState,
  syncErrorMessage,
  syncQueryOptions,
} from "@/lib/stv-sync";
import { useLinkChannel, useSetSyncEnabled } from "@/lib/stv-sync-mutations";

/**
 * A server's 7TV channel sync: setup, the linked channel and its status, the queue of
 * emotes it couldn't add, and its settings.
 */
export function StvSync({ guild }: { guild: ManagedGuild }) {
  const state = useQuery(syncQueryOptions(guild.id));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <GuildIcon guild={guild} size="lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 items-center gap-2">
              <Heading level={1} size="lg" className="min-w-0 truncate">
                7TV sync
              </Heading>
              <Badge tone="signal">experimental</Badge>
            </div>
            <Link
              to="/panel/servers/$guildId"
              params={{ guildId: guild.id }}
              className="min-w-0 cursor-default truncate font-mono text-muted text-xs no-underline hover:text-foreground"
            >
              ← {guild.name}
            </Link>
          </div>
        </div>
        <Notice title="experimental: this may behave unpredictably" className="max-w-2xl">
          when the streamer adds an emote to their active 7TV set, tetra adds it here, and
          when they remove it, tetra removes the one it added. nothing from before you
          link the channel is added, and changes while tetra is offline are missed
        </Notice>
      </header>

      {state.status === "pending" ? (
        <PanelLoading>loading the sync</PanelLoading>
      ) : state.status === "error" ? (
        <PanelError retrying={state.isFetching} onRetry={() => void state.refetch()}>
          i couldn&apos;t load the sync. {syncErrorMessage(state.error)}
        </PanelError>
      ) : (
        <SyncBody guild={guild} state={state.data} />
      )}
    </div>
  );
}

function SyncBody({ guild, state }: { guild: ManagedGuild; state: SyncState }) {
  const { sync, available } = state;

  if (!sync) {
    return available ? <LinkChannel guildId={guild.id} /> : <Unavailable />;
  }

  return (
    <>
      {!available && <Unavailable />}
      <SyncStatus guild={guild} state={state} sync={sync} />
      <Section id="sync-queue" title="queue" count={sync.queuedEmotes}>
        <StvSyncQueue guild={guild} />
      </Section>
      <Section id="sync-settings" title="settings">
        <StvSyncSettings guildId={guild.id} sync={sync} defaults={state.defaults} />
      </Section>
    </>
  );
}

function Unavailable() {
  return (
    <div className="flex max-w-lg flex-col items-start gap-2 border border-border p-6">
      <Heading level={2} size="sm">
        the 7TV sync isn&apos;t active on this tetra instance
      </Heading>
      <Text size="sm" tone="muted">
        it&apos;s turned off where tetra runs, so it doesn&apos;t follow any channel right
        now. nothing here changes until it&apos;s turned on again
      </Text>
    </div>
  );
}

function Section({
  id,
  title,
  count,
  children,
}: {
  id: string;
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 border-border border-t pt-8"
    >
      <Heading id={id} level={2} size="sm" className="flex items-baseline gap-2">
        {title}
        {count !== undefined && count > 0 && (
          <span className="font-mono font-normal text-muted text-xs tabular-nums">
            {count}
          </span>
        )}
      </Heading>
      {children}
    </section>
  );
}

function LinkChannel({ guildId }: { guildId: string }) {
  const link = useLinkChannel(guildId);

  return (
    <section aria-labelledby="sync-link" className="flex max-w-xl flex-col gap-3">
      <Heading id="sync-link" level={2} size="sm">
        link a Twitch channel
      </Heading>
      <Text size="sm" tone="muted">
        pick the channel whose 7TV emotes this server should follow. it needs a 7TV
        account. one channel per server
      </Text>
      <ChannelSearch defaultValue="" onChoose={(login) => link.mutate(login)} />
      {link.isPending && <PanelLoading>linking {link.variables}</PanelLoading>}
      {link.isError && (
        <p role="alert" className="text-danger text-sm">
          {syncErrorMessage(link.error)}
        </p>
      )}
    </section>
  );
}

const TONE_MARK = {
  live: "bg-primary",
  off: "bg-neutral-600",
};

function SyncStatus({
  guild,
  state,
  sync,
}: {
  guild: ManagedGuild;
  state: SyncState;
  sync: LinkedSync;
}) {
  const setEnabled = useSetSyncEnabled(guild.id);
  // The switch shows where it's going while the request runs
  const enabled = setEnabled.isPending ? setEnabled.variables : sync.enabled;
  const status = state.available
    ? connectionStatus(state.connection, sync)
    : { label: "off on this tetra instance", tone: "off" as const };
  const { channel } = sync;

  return (
    <section
      aria-labelledby="sync-channel"
      className="flex max-w-2xl flex-col gap-5 border border-border p-5"
    >
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-mono text-muted text-xs">syncing from</p>
          <Heading id="sync-channel" level={2} size="md" className="min-w-0 truncate">
            {channel.displayName}
          </Heading>
          <p className="font-mono text-muted text-xs">
            {channel.displayName.toLowerCase() !== channel.login && `${channel.login} · `}
            linked {relativeTime(Date.parse(sync.linkedAt))}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="ghost"
            render={
              <a
                href={`https://7tv.app/users/${channel.stvUserId}`}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            open on 7TV
            <span aria-hidden="true" className="font-mono text-muted text-xs">
              ↗&#xFE0E;
            </span>
          </Button>
          <UnlinkSyncDialog guildId={guild.id} channelName={channel.displayName} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-xs sm:grid-cols-3">
        <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
          <dt className="text-muted">status</dt>
          <dd className="m-0 flex items-center gap-2 text-foreground">
            {status.tone === "busy" ? (
              <Spinner />
            ) : (
              <span
                aria-hidden="true"
                className={cn("size-1.5", TONE_MARK[status.tone])}
              />
            )}
            {status.label}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted">synced emotes</dt>
          <dd className="m-0 text-foreground tabular-nums">{sync.linkedEmotes}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted">in the queue</dt>
          <dd className="m-0 text-foreground tabular-nums">{sync.queuedEmotes}</dd>
        </div>
      </dl>

      {!channel.emoteSetId && (
        <Text size="sm" tone="muted">
          {channel.displayName} has no active 7TV set. the sync starts following it once
          they pick one
        </Text>
      )}

      <Switch
        label="sync new emotes"
        description={
          enabled
            ? "emotes added to or removed from the 7TV set change here too"
            : "paused. changes on 7TV while it's paused are missed, not caught up later"
        }
        checked={enabled}
        disabled={setEnabled.isPending}
        onCheckedChange={(next) => setEnabled.mutate(next)}
        className="border-border border-t pt-4"
      />
    </section>
  );
}

/**
 * The server page's way in: whether a channel is synced and how many emotes wait in the
 * queue. Hidden where the sync isn't running and nothing is linked.
 */
export function StvSyncTile({ guildId }: { guildId: string }) {
  const state = useQuery({ ...syncQueryOptions(guildId), refetchInterval: false });
  if (!state.data || (!state.data.available && !state.data.sync)) return null;
  const { sync } = state.data;

  return (
    <div className="flex min-w-0 max-w-md flex-1 basis-64 items-center gap-4 border border-border p-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="m-0 flex items-center gap-2 font-mono text-muted text-xs">
          7TV sync
          <Badge tone="signal">experimental</Badge>
        </p>
        <p className="m-0 truncate text-foreground text-sm">
          {sync
            ? `${sync.enabled ? "following" : "paused on"} ${sync.channel.displayName}`
            : "add emotes from a Twitch channel's 7TV set"}
        </p>
        {sync && sync.queuedEmotes > 0 && (
          <p className="m-0 font-mono text-primary text-xs tabular-nums">
            {sync.queuedEmotes} in the queue
          </p>
        )}
      </div>
      <Button
        size="sm"
        className="ml-auto shrink-0"
        render={<Link to="/panel/servers/$guildId/sync" params={{ guildId }} />}
      >
        {sync ? "manage" : "set up"}
      </Button>
    </div>
  );
}
