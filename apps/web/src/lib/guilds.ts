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
