import type { QueryClient } from "@tanstack/react-query";

import {
  type GuildDetails,
  type GuildLists,
  guildQueryOptions,
  guildsQueryOptions,
  type ManagedGuild,
} from "@/lib/guilds";

export type SlotType = "static" | "animated";

export const slotTypeOf = (animated: boolean): SlotType =>
  animated ? "animated" : "static";

/** Core answers a created emoji with its CDN link, and only animated ones are `.gif`. */
export const slotTypeOfPreview = (preview: string): SlotType =>
  /\.gif(\?|$)/.test(preview) ? "animated" : "static";

export type SlotSnapshot = { list?: GuildLists; detail?: GuildDetails };

/**
 * Stops fetches of the server list and the server's details that would land on top of a
 * local change, and returns both caches for a rollback.
 */
export async function holdSlotCounts(
  queryClient: QueryClient,
  guildId: string
): Promise<SlotSnapshot> {
  const detailKey = guildQueryOptions(guildId).queryKey;
  await Promise.all([
    queryClient.cancelQueries({ queryKey: guildsQueryOptions.queryKey, exact: true }),
    queryClient.cancelQueries({ queryKey: detailKey, exact: true }),
  ]);
  return {
    list: queryClient.getQueryData(guildsQueryOptions.queryKey),
    detail: queryClient.getQueryData(detailKey),
  };
}

export function restoreSlotCounts(
  queryClient: QueryClient,
  guildId: string,
  { list, detail }: SlotSnapshot
) {
  if (list) queryClient.setQueryData(guildsQueryOptions.queryKey, list);
  if (detail) queryClient.setQueryData(guildQueryOptions(guildId).queryKey, detail);
}

/** Moves the used count of one slot type in both caches every slot display reads. */
export function shiftSlotCounts(
  queryClient: QueryClient,
  guildId: string,
  type: SlotType,
  delta: number
) {
  queryClient.setQueryData(guildsQueryOptions.queryKey, (lists) => {
    if (!lists) return lists;
    const shift = (guilds: ManagedGuild[]) =>
      guilds.map((guild) =>
        guild.id === guildId
          ? {
              ...guild,
              emojis: {
                ...guild.emojis,
                [type]: Math.max(guild.emojis[type] + delta, 0),
              },
            }
          : guild
      );
    return {
      ...lists,
      guildsWithUserPermissions: shift(lists.guildsWithUserPermissions),
      guildsWithBot: shift(lists.guildsWithBot),
    };
  });

  queryClient.setQueryData(guildQueryOptions(guildId).queryKey, (guild) => {
    if (!guild) return guild;
    const slots = guild.stats[type];
    const used = Math.max(slots.used + delta, 0);
    return {
      ...guild,
      stats: {
        ...guild.stats,
        [type]: { ...slots, used, free: Math.max(slots.limit - used, 0) },
      },
    };
  });
}

// `GET /guilds` counts from the bot's gateway cache, which learns about a change from
// Discord's GUILD_EMOJIS_UPDATE, often after the REST call that made it has answered
const LIST_SETTLE_DELAY = 3000;
let listRefetch: ReturnType<typeof setTimeout> | undefined;

/**
 * After a change on a server: its details (read from Discord's REST API, so accurate)
 * refetch now, the server list only once the bot's cache has caught up. Each change
 * pushes the list refetch back, so a burst of adds ends with one.
 */
export function refreshSlotCounts(queryClient: QueryClient, guildId: string) {
  clearTimeout(listRefetch);
  listRefetch = setTimeout(() => {
    void queryClient.invalidateQueries({
      queryKey: guildsQueryOptions.queryKey,
      exact: true,
    });
  }, LIST_SETTLE_DELAY);
  return queryClient.invalidateQueries({ queryKey: guildQueryOptions(guildId).queryKey });
}
