import { useSyncExternalStore } from "react";

const STORAGE_KEY = "tetra:panel:recent-guilds";
const LIMIT = 100;
const EMPTY: string[] = [];

let cache: string[] | null = null;
const listeners = new Set<() => void>();

// Storage can be missing or throw (private mode, blocked site data): fall back to no history
const read = () => {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    cache = Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    cache = [];
  }
  return cache;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Server ids the user opened in the panel, most recent first (this browser only). */
export const useRecentGuildIds = () => useSyncExternalStore(subscribe, read, () => EMPTY);

export const markGuildOpened = (guildId: string) => {
  const current = read();
  if (current[0] === guildId) return;
  cache = [guildId, ...current.filter((id) => id !== guildId)].slice(0, LIMIT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Kept in memory for this visit only
  }
  for (const listener of listeners) listener();
};

/** Recently opened first, the rest alphabetically. */
export const sortByRecent = <T extends { id: string; name: string }>(
  guilds: T[],
  recentIds: string[]
) => {
  const rank = new Map(recentIds.map((id, index) => [id, index]));
  return [...guilds].sort((a, b) => {
    const rankA = rank.get(a.id) ?? Number.POSITIVE_INFINITY;
    const rankB = rank.get(b.id) ?? Number.POSITIVE_INFINITY;
    if (rankA !== rankB) return rankA - rankB;
    return a.name.localeCompare(b.name);
  });
};
