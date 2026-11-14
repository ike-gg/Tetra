import { useQuery } from "@tanstack/react-query";

import { GuildIcon } from "@/components/panel/guild-icon";
import { MenuItem } from "@/components/ui/menu";
import { guildsQueryOptions, type ManagedGuild, sortByName } from "@/lib/guilds";

type ServerMenuItemsProps = {
  // Decides which slots count: animated or static
  animated: boolean;
  onPick: (guild: ManagedGuild) => void;
  // The emote's own server, marked "here"
  hereId?: string;
};

/**
 * The user's manageable servers as menu items with the free slots for the emote's type.
 * Full servers stay listed but disabled. Used by every "Add to server" menu.
 */
export function ServerMenuItems({ animated, onPick, hereId }: ServerMenuItemsProps) {
  const guilds = useQuery(guildsQueryOptions);
  const slots = animated ? "animated" : "static";
  const targets = sortByName(guilds.data?.guildsWithUserPermissions ?? []);

  return (
    <>
      {guilds.status === "pending" && (
        <MenuItem variant="info">Loading servers…</MenuItem>
      )}
      {guilds.status === "error" && (
        <MenuItem variant="info">Couldn&apos;t load your servers</MenuItem>
      )}
      {guilds.status === "success" && targets.length === 0 && (
        <MenuItem variant="info">No servers you can manage</MenuItem>
      )}
      {targets.map((target) => {
        const free = target.emojis.limit - target.emojis[slots];
        return (
          <MenuItem
            key={target.id}
            label={target.name}
            // Full servers stay listed (and focusable) so it's clear why they can't take it
            disabled={free <= 0}
            onSelect={() => onPick(target)}
          >
            <GuildIcon guild={target} size="sm" />
            <span className="min-w-0 truncate">{target.name}</span>
            <span className="ml-auto shrink-0 pl-4 font-mono text-muted text-xs tabular-nums">
              {target.id === hereId ? "here · " : ""}
              {free <= 0 ? `${slots} full` : `${free} free`}
            </span>
          </MenuItem>
        );
      })}
    </>
  );
}
