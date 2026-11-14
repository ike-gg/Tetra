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
  /** Set on task emotes: the editor task the panel editor opens (`/panel/editor/$taskId`). */
  taskId?: string;
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

/** Discord ids are snowflakes: a longer id is newer, equal lengths compare as text. */
export const compareSnowflakes = (a: string, b: string) =>
  a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);

/** Discord accepts 2–32 letters, digits and underscores; 7TV and BTTV names may not fit. */
export const toDiscordEmoteName = (name: string) => {
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 32);
  return cleaned.length >= 2 ? cleaned : cleaned.padEnd(2, "_");
};
