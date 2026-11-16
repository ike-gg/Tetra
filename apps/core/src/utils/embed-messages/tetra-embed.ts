import { EmbedBuilder, type EmbedData } from "discord.js";

import { type FeedbackType, feedbackEmoji } from "@/utils/discord/feedback-emojis";

interface ExtraEmbedData extends EmbedData {
  hideTitle?: boolean;
  /**
   * Keeps the title as a bold first line above the description. Only for messages whose
   * title says something the description doesn't (see docs/core.md, "Generic replies");
   * everything else drops the title when there is a description.
   */
  keepTitle?: boolean;
}

export type TetraEmbedContent = ExtraEmbedData | string;

/**
 * Neutral accent (`neutral-50`, the brand's foreground white): colour is carried by the
 * reply type's emoji, not by the side bar (branding: emotes are the colour).
 */
export const TETRA_ACCENT_COLOR = 0xfbfaf9;

const DEFAULT_TEXT: Record<FeedbackType, string> = {
  success: "Success",
  error: "Something went wrong",
  attention: "Attention",
  panel: "Tetra Panel",
  warning: "Warning",
  info: "Information",
  media: "Media",
  premium: "Tetra Premium",
  working: "Working on it...",
};

// Old animated loading emotes some texts still end with; the working emoji replaces them
const CUSTOM_EMOJI_SUFFIX = /\s*<a?:\w+:\d+>\s*$/;

/**
 * Compact body: `<emoji> <description>` (the title is dropped), `<emoji> <title>` when
 * there is only a title, fields as `-# name: value` lines. Media and the rest stay.
 */
const compactBody = (type: FeedbackType, content: TetraEmbedContent): EmbedData => {
  if (typeof content === "string") {
    return { description: `${feedbackEmoji(type)} ${content}` };
  }

  const { hideTitle, keepTitle, title, description, fields, ...rest } = content;
  const emoji = feedbackEmoji(type);
  const cleanTitle = type === "working" ? title?.replace(CUSTOM_EMOJI_SUFFIX, "") : title;

  let body: string;
  if (hideTitle) {
    body = description ?? "";
  } else if (description && keepTitle && cleanTitle) {
    body = `${emoji} **${cleanTitle}**\n${description}`;
  } else if (description) {
    body = `${emoji} ${description}`;
  } else {
    body = `${emoji} ${cleanTitle || DEFAULT_TEXT[type]}`;
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
    const { hideTitle: _hide, keepTitle: _keep, ...data } = content;
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
