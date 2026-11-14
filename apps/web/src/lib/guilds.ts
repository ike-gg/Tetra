import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

const fetchGuilds = () => unwrap(api.guilds.$get());

/** The user's servers, split by whether Tetra is on them and the user can manage emotes. */
export const guildsQueryOptions = queryOptions({
  queryKey: ["guilds"],
  queryFn: fetchGuilds,
});

export type GuildLists = Awaited<ReturnType<typeof fetchGuilds>>;
export type Guild = GuildLists["guildsWithoutBotAvailableToAdd"][number];
export type ManagedGuild = GuildLists["guildsWithUserPermissions"][number];

export const guildIconUrl = ({ id, icon }: Pick<Guild, "id" | "icon">) =>
  icon
    ? `https://cdn.discordapp.com/icons/${id}/${icon}.${icon.startsWith("a_") ? "gif" : "webp"}?size=128`
    : null;

/** Discord's own fallback: the first character of each word, at most three. */
export const guildInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word)[0])
    .join("")
    .slice(0, 3);

/** Any of the user's servers by id, for labels (tasks may point to any of them). */
export const findGuild = (lists: GuildLists | undefined, guildId: string) =>
  lists &&
  [
    ...lists.guildsWithUserPermissions,
    ...lists.guildsWithBot,
    ...lists.guildsWithoutBotAvailableToAdd,
  ].find((guild) => guild.id === guildId);

/** Fixed alphabetical order, so the sidebar and Home never reshuffle. */
export const sortByName = <T extends { name: string }>(guilds: T[]) =>
  [...guilds].sort((a, b) => a.name.localeCompare(b.name));

const fetchGuild = (guildId: string) =>
  unwrap(api.guilds[":guildId"].$get({ param: { guildId } }));

/** One server with its emotes, fetched live from Discord (`["guilds", guildId]`). */
export const guildQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: ["guilds", guildId],
    queryFn: () => fetchGuild(guildId),
  });

export type GuildDetails = Awaited<ReturnType<typeof fetchGuild>>;
export type GuildEmote = GuildDetails["emotes"][number];

const fetchRemovedEmotes = (guildId: string) =>
  unwrap(api.guilds[":guildId"].removed.$get({ param: { guildId } }));

/** Emotes removed from a server that Tetra can put back (`["guilds", guildId, "removed"]`). */
export const removedEmotesQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: ["guilds", guildId, "removed"],
    queryFn: () => fetchRemovedEmotes(guildId),
  });

export type RemovedEmote = Awaited<ReturnType<typeof fetchRemovedEmotes>>[number];
