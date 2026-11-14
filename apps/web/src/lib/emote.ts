import type { CatalogEmote } from "@/lib/catalog";
import type { GuildEmote, RemovedEmote } from "@/lib/guilds";
import type { Task } from "@/lib/tasks";

export type EmoteSource = "discord" | "7tv" | "bttv" | "ffz" | "twitch" | "link";

export type Fitting = "contain" | "cover" | "fill";

/**
 * The one shape every emote in the panel is shown with, whatever API it came from.
 * Build it with the adapters below, never by hand at a call site.
 */
export type PanelEmote = {
  /** Unique within a list: React key, menu payload, per-emote UI state. */
  key: string;
  /** Id at the source (a Discord emoji id, a 7TV id…). */
  id: string;
  name: string;
  /** Small image for tiles. */
  previewUrl: string;
  /** Full-size file: what "Add to server" sends and "Open original" opens. */
  url: string;
  animated: boolean;
  source: EmoteSource;
  /** The Discord server the emote is on (or was removed from, or a task belongs to). */
  guildId?: string;
  /** Twitch integration emote: Discord manages it, it can't be removed. */
  managed?: boolean;
  /** False when the server lost the boost that gave it room. */
  available?: boolean;
  /** Set on removed emotes: the id `POST /guilds/:guildId/restore/:restoreId` takes. */
  restoreId?: number;
  /** Set on task emotes: the editor task the panel editor opens (`/panel/tasks/$taskId`). */
  taskId?: string;
  /** The emote's page at its source (7TV, BTTV, FFZ); "Open original" prefers it. */
  pageUrl?: string;
  /** Pixel size when the source states it. */
  width?: number;
  height?: number;
};

type StoredEmote = Task["emote"];

const ORIGIN_SOURCES: Record<StoredEmote["origin"], EmoteSource> = {
  DISCORD: "discord",
  SEVENTV: "7tv",
  BTTV: "bttv",
  FFZ: "ffz",
  TWITCH: "twitch",
  CUSTOM: "link",
};

export const SOURCE_LABELS: Record<EmoteSource, string> = {
  discord: "Discord",
  "7tv": "7TV",
  bttv: "BTTV",
  ffz: "FFZ",
  twitch: "Twitch",
  link: "link",
};

// Server emojis always have an id; only unicode emojis don't
export const fromGuildEmote = (emote: GuildEmote): PanelEmote => ({
  key: `discord:${emote.id}`,
  id: emote.id ?? "",
  name: emote.name ?? "emote",
  previewUrl: `${emote.imageURL}?size=128`,
  url: emote.imageURL,
  animated: emote.animated ?? false,
  source: "discord",
  guildId: emote.guildId,
  managed: emote.managed ?? false,
  available: emote.available ?? true,
});

const fromStoredEmote = (emote: StoredEmote): PanelEmote => ({
  key: `stored:${emote.id}`,
  id: emote.externalId,
  name: emote.name,
  previewUrl: emote.previewUrl,
  url: emote.url,
  animated: emote.isAnimated,
  source: ORIGIN_SOURCES[emote.origin],
});

export const fromRemovedEmote = (removed: RemovedEmote, guildId: string): PanelEmote => ({
  ...fromStoredEmote(removed.emote),
  key: `removed:${removed.id}`,
  guildId,
  restoreId: removed.id,
});

export const fromTask = (task: Task): PanelEmote => ({
  ...fromStoredEmote(task.emote),
  key: `task:${task.id}`,
  guildId: task.guildId,
  taskId: task.id,
});

const PAGE_URLS: Partial<Record<EmoteSource, (id: string) => string>> = {
  "7tv": (id) => `https://7tv.app/emotes/${id}`,
  bttv: (id) => `https://betterttv.com/emotes/${id}`,
  ffz: (id) => `https://www.frankerfacez.com/emoticon/${id}`,
};

/** Found by link (`GET /emotes/resolve`) or by Browse's searches (`lib/providers/`). */
export const fromCatalogEmote = (emote: CatalogEmote): PanelEmote => ({
  key: `${emote.source}:${emote.id}`,
  id: emote.id,
  name: emote.name,
  previewUrl: emote.previewUrl,
  url: emote.url,
  animated: emote.animated,
  source: emote.source,
  pageUrl: PAGE_URLS[emote.source]?.(emote.id),
  width: emote.width,
  height: emote.height,
});

/** Discord ids are snowflakes: a longer id is newer, equal lengths compare as text. */
export const compareSnowflakes = (a: string, b: string) =>
  a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);

// Same rule as core's EMOTE_NAME_REGEX
const DISCORD_EMOTE_NAME = /^[a-zA-Z0-9_]{2,32}$/;

export const isDiscordEmoteName = (name: string) => DISCORD_EMOTE_NAME.test(name);

/**
 * Discord accepts 2–32 letters, digits and underscores; 7TV and BTTV names may not fit.
 * Runs of other characters become one `_`, and edge underscores they leave are dropped.
 */
export const toDiscordEmoteName = (name: string) => {
  if (isDiscordEmoteName(name)) return name;
  const replaced = name.replace(/[^a-zA-Z0-9_]+/g, "_");
  const trimmed = replaced.replace(/^_+|_+$/g, "");
  const cleaned = (trimmed.length >= 2 ? trimmed : replaced).slice(0, 32);
  return cleaned.length >= 2 ? cleaned : cleaned.padEnd(2, "_");
};
