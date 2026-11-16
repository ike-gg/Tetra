import { EmbedBuilder, type EmbedData } from "discord.js";

import { tightText } from "@/utils/discord/components-v2";
import { type FeedbackType, feedbackEmoji } from "@/utils/discord/feedback-emojis";

interface ExtraEmbedData extends EmbedData {
  hideTitle?: boolean;
}

export type TetraEmbedContent = ExtraEmbedData | string;

/**
 * Neutral accent (`neutral-50`, the brand's foreground white): colour is carried by the
 * reply type's emoji, not by the side bar (branding: emotes are the colour).
 */
export const TETRA_ACCENT_COLOR = 0xfbfaf9;

// Texts follow docs/voice.md; only shown when a reply has neither title nor description
const DEFAULT_TEXT: Record<FeedbackType, string> = {
  success: "done",
  error: "something went wrong",
  attention: "check this",
  panel: "panel",
  warning: "warning",
  info: "info",
  media: "media",
  premium: "premium",
  working: "working on it",
};

/**
 * Compact body, one block of text: `<emoji> <description>` (the title is dropped),
 * `<emoji> <title>` when there is only a title, fields as `-# name: value` lines, blank
 * lines removed. Media and the rest stay.
 */
const compactBody = (type: FeedbackType, content: TetraEmbedContent): EmbedData => {
  if (typeof content === "string") {
    return { description: `${feedbackEmoji(type)} ${tightText(content).trimStart()}` };
  }

  const { hideTitle, title, description, fields, ...rest } = content;
  const emoji = feedbackEmoji(type);

  let body: string;
  if (hideTitle) {
    body = tightText(description ?? "");
  } else if (description) {
    body = `${emoji} ${tightText(description).trimStart()}`;
  } else {
    body = `${emoji} ${title || DEFAULT_TEXT[type]}`;
  }

  const fieldLines = (fields ?? []).map((field) => `-# ${field.name}: ${field.value}`);

  return {
    ...rest,
    description: [body, ...fieldLines].filter(Boolean).join("\n") || undefined,
  };
};

/**
 * Embeds for the generic replies. `FeedbackManager` turns them into Components v2
 * containers (`src/utils/discord/components-v2.ts`); legacy v1 messages keep them as embeds.
 */
export class TetraEmbed {
  static _transform(content: TetraEmbedContent): EmbedData {
    if (typeof content === "string") {
      return {
        description: content,
      };
    }
    const { hideTitle: _hide, ...data } = content;
    return data;
  }

  private stack: EmbedBuilder[] = [];

  append(embed: EmbedBuilder) {
    this.stack.push(embed);
  }

  get embeds() {
    return this.stack;
  }

  private static build(type: FeedbackType, content: TetraEmbedContent) {
    return new EmbedBuilder({ color: TETRA_ACCENT_COLOR, ...compactBody(type, content) });
  }

  static success(content: TetraEmbedContent) {
    return this.build("success", content);
  }

  static error(content: TetraEmbedContent) {
    return this.build("error", content);
  }

  static attention(content: TetraEmbedContent) {
    return this.build("attention", content);
  }

  static panel(content: TetraEmbedContent) {
    return this.build("panel", content);
  }

  static warning(content: TetraEmbedContent) {
    return this.build("warning", content);
  }

  static info(content: TetraEmbedContent) {
    return this.build("info", content);
  }

  static media(content: TetraEmbedContent) {
    return this.build("media", content);
  }

  static premium(content: TetraEmbedContent) {
    return this.build("premium", content);
  }

  /** `working()`: the animated emoji. */
  static working(content: TetraEmbedContent) {
    return this.build("working", content);
  }
}
