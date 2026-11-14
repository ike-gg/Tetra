// The quick editor runs in two places that share the local library: the public site
// (no account) and the panel. Each keeps its own start screen and file route.
export const EDITOR_HOSTS = {
  public: { start: "/editor", file: "/editor/$key", discordByDefault: false },
  panel: { start: "/panel/editor", file: "/panel/editor/$key", discordByDefault: true },
} as const;

export type EditorHost = keyof typeof EDITOR_HOSTS;
