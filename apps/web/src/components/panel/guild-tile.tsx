import { Link } from "@tanstack/react-router";

import { GuildIcon } from "@/components/panel/guild-icon";
import { SlotMeter } from "@/components/ui/slot-meter";
import type { ManagedGuild } from "@/lib/guilds";

export const TILE =
  "flex h-full cursor-default select-none flex-col gap-4 bg-background p-4 no-underline hover:bg-surface active:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-brand-300 focus-visible:-outline-offset-2";

export function GuildTile({ guild }: { guild: ManagedGuild }) {
  const { static: staticSlots, animated, limit } = guild.emojis;

  return (
    <Link to="/panel/servers/$guildId" params={{ guildId: guild.id }} className={TILE}>
      <div className="flex min-w-0 items-center gap-3">
        <GuildIcon guild={guild} />
        <span className="truncate font-medium text-foreground text-sm">{guild.name}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SlotMeter label="static" used={staticSlots} limit={limit} />
        <SlotMeter label="animated" used={animated} limit={limit} />
      </div>
    </Link>
  );
}
