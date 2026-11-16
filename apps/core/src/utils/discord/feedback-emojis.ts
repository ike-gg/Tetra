import type { Client } from "discord.js";

import { BotConsole } from "#/loggers";

/**
 * Reply types of `FeedbackManager`, each shown by its own application emoji (uploaded with
 * `emojis:sync` from `assets/emotes/feedback/`). Dev and prod are separate Discord
 * applications, so ids are resolved by name at runtime, never hardcoded.
 */
export const FEEDBACK_EMOJIS = {
  success: { name: "tetra_success", file: "tetra-success.png", fallback: "🟩" },
  error: { name: "tetra_error", file: "tetra-error.png", fallback: "🟥" },
  warning: { name: "tetra_warning", file: "tetra-warning.png", fallback: "🟨" },
  attention: { name: "tetra_attention", file: "tetra-attention.png", fallback: "🟧" },
  info: { name: "tetra_info", file: "tetra-info.png", fallback: "🟦" },
  panel: { name: "tetra_panel", file: "tetra-panel.png", fallback: "⬜" },
  media: { name: "tetra_media", file: "tetra-media.png", fallback: "▶️" },
  premium: { name: "tetra_premium", file: "tetra-premium.png", fallback: "🟪" },
  working: { name: "tetra_working", file: "tetra-working.gif", fallback: "⏳" },
} as const;

export type FeedbackType = keyof typeof FEEDBACK_EMOJIS;

// Per shard process; filled once on ready, empty (fallbacks) until then
const resolved = new Map<string, string>();

export const loadFeedbackEmojis = async (client: Client<true>) => {
  try {
    const emojis = await client.application.emojis.fetch();
    const wanted = new Set<string>(Object.values(FEEDBACK_EMOJIS).map((e) => e.name));

    for (const emoji of emojis.values()) {
      if (emoji.name && wanted.has(emoji.name))
        resolved.set(emoji.name, emoji.toString());
    }

    const missing = [...wanted].filter((name) => !resolved.has(name));
    if (missing.length > 0) {
      BotConsole.warn(
        `Missing application emojis (run emojis:sync): ${missing.join(", ")}; using fallbacks`
      );
    }
  } catch (error) {
    BotConsole.warn("Failed to load application emojis, using fallbacks:", error);
  }
};

export const feedbackEmoji = (type: FeedbackType) => {
  const { name, fallback } = FEEDBACK_EMOJIS[type];
  return resolved.get(name) ?? fallback;
};
