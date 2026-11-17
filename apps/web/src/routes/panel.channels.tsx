import { type UseQueryResult, useQueries, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";

import { EmoteGrid } from "@/components/emote/emote-grid";
import { EmoteMenu } from "@/components/emote/emote-menu";
import { ChannelAvatar } from "@/components/panel/channel-avatar";
import { ChannelSearch } from "@/components/panel/channel-search";
import { PanelError, PanelLoading } from "@/components/panel/query-state";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import {
  SegmentedControl,
  SegmentedControlItem,
} from "@/components/ui/segmented-control";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { lookupErrorMessage } from "@/lib/catalog";
import {
  CHANNEL_PROVIDER_NAMES,
  CHANNEL_PROVIDERS,
  type ChannelEmote,
  type ChannelProvider,
  channelEmotesQueryOptions,
  channelQueryOptions,
  isChannelNotFound,
  parseTwitchLogin,
  type TwitchChannel,
  twitchErrorMessage,
} from "@/lib/channels";
import { guildsQueryOptions } from "@/lib/guilds";
import { NOINDEX_META } from "@/lib/seo";

type ChannelsSearch = {
  /** Twitch login, lowercase. */
  channel?: string;
  /** Only once picked: without it the first site with emotes is shown. */
  provider?: ChannelProvider;
  /** Server the emotes are meant for: preselected when adding. */
  guild?: string;
};

type Guild = { id: string; name: string };

export const Route = createFileRoute("/panel/channels")({
  head: () => ({ meta: [{ title: "channel emotes · tetra" }, NOINDEX_META] }),
  validateSearch: (search: Record<string, unknown>): ChannelsSearch => ({
    channel:
      typeof search.channel === "string"
        ? (parseTwitchLogin(search.channel) ?? undefined)
        : undefined,
    provider: CHANNEL_PROVIDERS.find((provider) => provider === search.provider),
    guild: typeof search.guild === "string" ? search.guild : undefined,
  }),
  component: PanelChannels,
});

function PanelChannels() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const guilds = useQuery(guildsQueryOptions);
  const found = guilds.data?.guildsWithUserPermissions.find(
    ({ id }) => id === search.guild
  );
  const guild = useMemo(() => found && { id: found.id, name: found.name }, [found]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Heading level={1} size="lg">
          channel emotes
        </Heading>
        <Text size="sm" tone="muted">
          find a Twitch channel and add its Twitch, 7TV, BTTV and FFZ emotes
          {guild ? (
            <>
              {" "}
              to <span className="text-foreground">{guild.name}</span>
            </>
          ) : (
            " to a server"
          )}
        </Text>
      </div>

      <div className="max-w-md">
        <ChannelSearch
          defaultValue={search.channel ?? ""}
          onChoose={(login) =>
            void navigate({
              search: (previous) => ({
                ...previous,
                channel: login,
                provider: undefined,
              }),
            })
          }
        />
      </div>

      {search.channel && (
        <ChannelView
          key={search.channel}
          login={search.channel}
          provider={search.provider}
          guild={guild}
        />
      )}
    </div>
  );
}

type ChannelViewProps = {
  login: string;
  provider?: ChannelProvider;
  guild?: Guild;
};

function ChannelView({ login, provider, guild }: ChannelViewProps) {
  const channel = useQuery(channelQueryOptions(login));

  if (channel.status === "pending") {
    return <PanelLoading>looking up {login} on Twitch</PanelLoading>;
  }
  if (channel.status === "error") {
    return isChannelNotFound(channel.error) ? (
      <Text size="sm" tone="muted">
        there's no Twitch channel called {login}. check the spelling, or pick one from the
        suggestions
      </Text>
    ) : (
      <PanelError retrying={channel.isFetching} onRetry={() => void channel.refetch()}>
        {twitchErrorMessage(channel.error)}
      </PanelError>
    );
  }
  return <ChannelEmotes channel={channel.data} provider={provider} guild={guild} />;
}

type ProviderState = UseQueryResult<ChannelEmote[]>;

const matches = (emotes: ChannelEmote[], filter: string) => {
  const needle = filter.trim().toLowerCase();
  return needle
    ? emotes.filter(({ name }) => name.toLowerCase().includes(needle))
    : emotes;
};

type ChannelEmotesProps = {
  channel: TwitchChannel;
  provider?: ChannelProvider;
  guild?: Guild;
};

function ChannelEmotes({ channel, provider: picked, guild }: ChannelEmotesProps) {
  const navigate = Route.useNavigate();
  const [filter, setFilter] = useState("");
  const hasTwitchEmotes = channel.broadcasterType !== null;
  const states = useQueries({
    queries: CHANNEL_PROVIDERS.map((provider) =>
      channelEmotesQueryOptions(
        provider,
        channel.id,
        provider !== "twitch" || hasTwitchEmotes
      )
    ),
  });
  const stateOf = (provider: ChannelProvider) =>
    states[CHANNEL_PROVIDERS.indexOf(provider)];

  // In tab order, the first site with emotes; it waits for a site still loading, so the
  // tab moves at most once, from a loading site to the next
  const automatic = (() => {
    for (const [index, provider] of CHANNEL_PROVIDERS.entries()) {
      const state = states[index];
      if (provider === "twitch" && !hasTwitchEmotes) continue;
      if (state.isPending) return provider;
      if (state.data?.length) return provider;
    }
    return CHANNEL_PROVIDERS[0];
  })();
  const provider = picked ?? automatic;
  const state = stateOf(provider);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <ChannelAvatar channel={channel} size="lg" />
        <div className="flex min-w-0 flex-col gap-1">
          <Heading level={2} size="md" className="truncate">
            {channel.displayName}
          </Heading>
          <p className="truncate font-mono text-muted text-xs">
            {channel.login}
            {channel.broadcasterType && ` · ${channel.broadcasterType}`}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto shrink-0"
          render={
            <a
              href={`https://www.twitch.tv/${channel.login}`}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          open on Twitch
          <span aria-hidden="true" className="font-mono text-muted text-xs">
            ↗&#xFE0E;
          </span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          aria-label="emote site"
          value={provider}
          onValueChange={(next) =>
            next &&
            void navigate({
              search: (previous) => ({ ...previous, provider: next as ChannelProvider }),
              replace: true,
            })
          }
          className="w-full sm:w-auto"
        >
          {CHANNEL_PROVIDERS.map((value) => (
            <SegmentedControlItem key={value} value={value} className="gap-1.5 px-2.5">
              {CHANNEL_PROVIDER_NAMES[value]}
              <TabCount
                state={stateOf(value)}
                disabled={value === "twitch" && !hasTwitchEmotes}
                filter={filter}
              />
            </SegmentedControlItem>
          ))}
        </SegmentedControl>
        <TextField
          label="filter by name"
          hideLabel
          type="search"
          value={filter}
          onValueChange={setFilter}
          placeholder="filter by name"
          className="min-w-40 flex-1 sm:max-w-64"
        />
      </div>

      <ProviderEmotes
        key={provider}
        provider={provider}
        state={state}
        channel={channel}
        guild={guild}
        filter={filter}
        onClearFilter={() => setFilter("")}
      />
    </div>
  );
}

type TabCountProps = { state: ProviderState; disabled: boolean; filter: string };

function TabCount({ state, disabled, filter }: TabCountProps) {
  const count = "font-mono text-muted text-xs tabular-nums";
  if (disabled) {
    return (
      <span className={count}>
        0<span className="sr-only"> emotes</span>
      </span>
    );
  }
  if (state.isPending) {
    return (
      <span className="inline-flex text-xs">
        <Spinner />
        <span className="sr-only">loading</span>
      </span>
    );
  }
  if (state.isError) {
    return (
      <span className="font-mono text-danger text-xs">
        <span aria-hidden="true">!</span>
        <span className="sr-only">couldn't load</span>
      </span>
    );
  }
  const total = state.data.length;
  const shown = matches(state.data, filter).length;
  return (
    <span className={count}>
      {filter.trim() ? shown : total}
      <span className="sr-only">{filter.trim() ? " matching" : " emotes"}</span>
    </span>
  );
}

type ProviderEmotesProps = {
  provider: ChannelProvider;
  state: ProviderState;
  channel: TwitchChannel;
  guild?: Guild;
  filter: string;
  onClearFilter: () => void;
};

function ProviderEmotes({
  provider,
  state,
  channel,
  guild,
  filter,
  onClearFilter,
}: ProviderEmotesProps) {
  const name = CHANNEL_PROVIDER_NAMES[provider];
  const shown = useMemo(() => matches(state.data ?? [], filter), [state.data, filter]);

  if (provider === "twitch" && channel.broadcasterType === null) {
    return (
      <Text size="sm" tone="muted">
        {channel.displayName} isn't a Twitch partner or affiliate, so the channel has no
        sub, follower or bits emotes
      </Text>
    );
  }
  if (state.isPending) return <PanelLoading>loading {name} emotes</PanelLoading>;
  if (state.isError) {
    return (
      <PanelError retrying={state.isFetching} onRetry={() => void state.refetch()}>
        {provider === "twitch"
          ? twitchErrorMessage(state.error)
          : lookupErrorMessage(state.error)}
      </PanelError>
    );
  }
  if (state.data.length === 0) {
    return (
      <Text size="sm" tone="muted">
        no {name} emotes on this channel
      </Text>
    );
  }
  if (shown.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Text size="sm" tone="muted">
          nothing on {name} matches “{filter.trim()}”
        </Text>
        <Button size="sm" onClick={onClearFilter}>
          clear filter
        </Button>
      </div>
    );
  }

  if (provider === "twitch") {
    return <TwitchGroups emotes={shown} channel={channel} guild={guild} />;
  }
  return (
    <EmoteMenu kind="catalog" guild={guild}>
      <EmoteGrid emotes={shown} label={`${channel.displayName}'s ${name} emotes`} />
    </EmoteMenu>
  );
}

type TwitchGroupsProps = {
  emotes: ChannelEmote[];
  channel: TwitchChannel;
  guild?: Guild;
};

// One list per group (follower, tier 1–3, bits): a selection belongs to one list
function TwitchGroups({ emotes, channel, guild }: TwitchGroupsProps) {
  const groups = useMemo(() => {
    const byGroup = new Map<string, ChannelEmote[]>();
    for (const emote of emotes) {
      const group = emote.group ?? "other";
      byGroup.set(group, [...(byGroup.get(group) ?? []), emote]);
    }
    return [...byGroup];
  }, [emotes]);

  return (
    <div className="flex flex-col gap-8">
      {groups.map(([group, list]) => (
        <TwitchGroup
          key={group}
          group={group}
          emotes={list}
          channel={channel}
          guild={guild}
        />
      ))}
    </div>
  );
}

type TwitchGroupProps = {
  group: string;
  emotes: ChannelEmote[];
  channel: TwitchChannel;
  guild?: Guild;
};

function TwitchGroup({ group, emotes, channel, guild }: TwitchGroupProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <Heading level={3} size="sm" id={headingId} className="flex items-baseline gap-2">
        {group}
        <span className="font-mono font-normal text-muted text-xs tabular-nums">
          {emotes.length}
        </span>
      </Heading>
      <EmoteMenu kind="catalog" guild={guild}>
        <EmoteGrid
          emotes={emotes}
          label={`${channel.displayName}'s ${group} emotes on Twitch`}
        />
      </EmoteMenu>
    </section>
  );
}
