import { createFileRoute } from "@tanstack/react-router";

import { StvSync } from "@/components/panel/stv-sync";
import { StvSyncGuild } from "@/components/panel/stv-sync-guild";
import { NOINDEX_META } from "@/lib/seo";

// Not nested in the server route (`$guildId_`): that page has no outlet, this one
// replaces it
export const Route = createFileRoute("/panel/servers/$guildId_/sync")({
  head: () => ({ meta: [{ title: "7TV sync · tetra" }, NOINDEX_META] }),
  component: PanelServerSync,
});

function PanelServerSync() {
  const { guildId } = Route.useParams();
  return (
    <StvSyncGuild guildId={guildId}>
      {(guild) => <StvSync key={guild.id} guild={guild} />}
    </StvSyncGuild>
  );
}
