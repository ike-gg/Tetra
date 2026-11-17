import { createFileRoute } from "@tanstack/react-router";

import { StvSyncGuild } from "@/components/panel/stv-sync-guild";
import { StvSyncActivity } from "@/components/panel/stv-sync-log";
import { NOINDEX_META } from "@/lib/seo";

// `sync_`: a sibling of the sync page, which has no outlet
export const Route = createFileRoute("/panel/servers/$guildId_/sync_/activity")({
  head: () => ({ meta: [{ title: "7TV sync activity · tetra" }, NOINDEX_META] }),
  component: PanelServerSyncActivity,
});

function PanelServerSyncActivity() {
  const { guildId } = Route.useParams();
  return (
    <StvSyncGuild guildId={guildId}>
      {(guild) => <StvSyncActivity key={guild.id} guild={guild} />}
    </StvSyncGuild>
  );
}
