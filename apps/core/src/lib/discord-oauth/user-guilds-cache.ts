import { z } from "zod";

import { redisClient } from "@/redis";
import { boundedRedisCall } from "@/redis/bounded-call";

import { discordOauth } from ".";

const CACHE_TTL_SECONDS = 60;

const userGuildSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  owner: z.boolean().optional(),
  permissions: z.string().optional(),
});

/** The fields of an OAuth guild that the API uses; nothing else is cached. */
export type UserGuild = z.infer<typeof userGuildSchema>;

const cacheKey = (discordUserId: string) => `oauth-user-guilds:${discordUserId}`;

const redisCall = <T>(run: () => Promise<T>) =>
  boundedRedisCall("User guilds cache", run);

const readCache = async (discordUserId: string) => {
  const raw = await redisCall(() => redisClient.get(cacheKey(discordUserId)));
  if (!raw) return null;
  try {
    const parsed = z.array(userGuildSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

// Concurrent requests of one user (e.g. the panel loading several views) share one call
const inFlight = new Map<string, Promise<UserGuild[]>>();

const fetchUserGuilds = async (discordUserId: string, accessToken: string) => {
  const guilds: UserGuild[] = (await discordOauth.getUserGuilds(accessToken)).map(
    ({ id, name, icon, owner, permissions }) => ({
      id,
      name,
      icon: icon ?? null,
      owner,
      permissions,
    })
  );

  await redisCall(() =>
    redisClient.set(
      cacheKey(discordUserId),
      JSON.stringify(guilds),
      "EX",
      CACHE_TTL_SECONDS
    )
  );

  return guilds;
};

/**
 * The user's Discord guilds (OAuth `/users/@me/guilds`, heavily rate-limited), cached
 * per Discord user id for 60 s. Only successful responses are cached; without Redis
 * every call goes to Discord. The token is never part of the key or the value.
 */
export const getUserGuilds = async (discordUserId: string, accessToken: string) => {
  const cached = await readCache(discordUserId);
  if (cached) return cached;

  const pending = inFlight.get(discordUserId);
  if (pending) return pending;

  const request = fetchUserGuilds(discordUserId, accessToken).finally(() =>
    inFlight.delete(discordUserId)
  );
  inFlight.set(discordUserId, request);
  return request;
};

/** Drops the cached guild list, e.g. on login and logout. Never throws. */
export const invalidateUserGuilds = async (discordUserId: string) => {
  await redisCall(() => redisClient.del(cacheKey(discordUserId)));
};
