import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { GuildsError } from "@/components/panel/guilds-error";
import { PanelLoading } from "@/components/panel/query-state";
import { StvSync } from "@/components/panel/stv-sync";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { guildsQueryOptions } from "@/lib/guilds";
import { NOINDEX_META } from "@/lib/seo";

// Not nested in the server route (`$guildId_`): that page has no outlet, this one
// replaces it
export const Route = createFileRoute("/panel/servers/$guildId_/sync")({
  head: () => ({ meta: [{ title: "7TV sync · tetra" }, NOINDEX_META] }),
  component: PanelServerSync,
});

function PanelServerSync() {
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
  if (guild) return <StvSync key={guild.id} guild={guild} />;

  return (
    <div className="flex max-w-lg flex-col items-start gap-4">
      <Heading level={1} size="lg">
        server not found
      </Heading>
      <Text size="sm" tone="muted">
        you need the manage expressions permission on a server with tetra to set up its
        7TV sync. check the link, or pick a server from the list
      </Text>
      <Button size="sm" render={<Link to="/panel" />}>
        back to home
      </Button>
    </div>
  );
}
