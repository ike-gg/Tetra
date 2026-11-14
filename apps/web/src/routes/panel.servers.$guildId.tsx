import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";

import { GuildIcon } from "@/components/panel/guild-icon";
import { GuildsError } from "@/components/panel/guilds-error";
import { PanelLoading } from "@/components/panel/query-state";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { SlotMeter } from "@/components/ui/slot-meter";
import { Text } from "@/components/ui/text";
import { guildsQueryOptions, type ManagedGuild } from "@/lib/guilds";
import { markGuildOpened } from "@/lib/recent-guilds";

export const Route = createFileRoute("/panel/servers/$guildId")({
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
  if (guild) return <ServerOverview guild={guild} />;

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

function ServerOverview({ guild }: { guild: ManagedGuild }) {
  const { static: staticSlots, animated, limit } = guild.emojis;

  useEffect(() => {
    markGuildOpened(guild.id);
  }, [guild.id]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex min-w-0 items-center gap-4">
        <GuildIcon guild={guild} size="lg" />
        <Heading level={1} size="lg" className="min-w-0 truncate">
          {guild.name}
        </Heading>
      </div>

      <div className="grid max-w-md grid-cols-2 gap-6 border border-border p-4">
        <SlotMeter label="static" used={staticSlots} limit={limit} />
        <SlotMeter label="animated" used={animated} limit={limit} />
      </div>

      <Text size="sm" tone="muted" className="max-w-lg">
        Browsing, adding and restoring this server&apos;s emotes lands here next. Until
        then, <span className="font-mono text-foreground">/addemote</span> in Discord does
        the job.
      </Text>
    </div>
  );
}
