import { EmbedBuilder, type EmbedData } from "discord.js";

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

const getEmojiTitle = (emoji: string, title: string) => `${emoji}  ${title}`;

const DEFAULT_TITLES: Record<Exclude<FeedbackType, "working">, string> = {
  success: "Success",
  error: "Something went wrong",
  attention: "Attention",
  panel: "Tetra Panel",
  warning: "Warning",
  info: "Information",
  media: "Media",
  premium: "Tetra Premium",
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
    const { hideTitle: _, ...data } = content;
    return data;
  }

  private stack: EmbedBuilder[] = [];

  append(embed: EmbedBuilder) {
    this.stack.push(embed);
  }

  get embeds() {
    return this.stack;
  }

  private static build(
    type: Exclude<FeedbackType, "working">,
    content: TetraEmbedContent
  ) {
    const details = this._transform(content);
    const hideTitle = typeof content === "object" && content.hideTitle;
    const title = getEmojiTitle(
      feedbackEmoji(type),
      details.title || DEFAULT_TITLES[type]
    );

    return new EmbedBuilder({
      color: TETRA_ACCENT_COLOR,
      ...details,
      title: hideTitle ? undefined : title,
    });
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

  /** `working()`: the animated emoji instead of the info one. */
  static working(content: TetraEmbedContent) {
    const details = this._transform(content);
    return new EmbedBuilder({
      color: TETRA_ACCENT_COLOR,
      ...details,
      title: getEmojiTitle(feedbackEmoji("working"), details.title || "Working on it..."),
    });
  }
}
