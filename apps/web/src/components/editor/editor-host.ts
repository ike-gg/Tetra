// The quick editor runs in two places that share the local library: the public site
// (no account) and the panel. Each keeps its own start screen and file route.
export const EDITOR_HOSTS = {
  public: { start: "/editor", file: "/editor/$key", discordByDefault: false },
  panel: { start: "/panel/editor", file: "/panel/editor/$key", discordByDefault: true },
} as const;

export type EditorHost = keyof typeof EDITOR_HOSTS;

// Set when the file came from a server's 7TV sync review list: "add" then goes to that
// entry. Both or neither
export type SyncSearch = { syncGuild?: string; syncEntry?: number };

export const validateSyncSearch = (search: Record<string, unknown>): SyncSearch => {
  const guild = typeof search.syncGuild === "string" ? search.syncGuild : "";
  const entry = Number(search.syncEntry);
  return /^\d{1,20}$/.test(guild) && Number.isInteger(entry) && entry > 0
    ? { syncGuild: guild, syncEntry: entry }
    : {};
};

// A start screen with `?open=<file url>` fetches that file into the library and opens
// it, so "open in editor" can be a plain link to a new tab. `name` names the file and
// marks the URL as the file itself; without it the URL is read like a pasted link
export type OpenSearch = { open?: string; name?: string };

// The router parses `?name=123` as a number when the URL wasn't built by it
const textParam = (value: unknown) =>
  typeof value === "string" || typeof value === "number" ? String(value) : undefined;

export const validateOpenSearch = (search: Record<string, unknown>): OpenSearch => {
  const open = textParam(search.open);
  const name = textParam(search.name);
  return { ...(open ? { open } : {}), ...(open && name ? { name } : {}) };
};
