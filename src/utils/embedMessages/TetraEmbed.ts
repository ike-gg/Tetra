import { EmbedBuilder, EmbedData } from "discord.js";

export type TetraEmbedContent = EmbedData | string;

const getEmojiTitle = (emoji: String, title: string) => `${emoji}  ${title}`;

export class TetraEmbed {
  static __transform(content: TetraEmbedContent): EmbedData {
    if (typeof content === "string") {
      return { description: content };
    }
    return content;
  }

  private stack: EmbedBuilder[] = [];

  constructor() {}

  append(embed: EmbedBuilder) {
    this.stack.push(embed);
  }

  get embeds() {
    return this.stack;
  }

  static success(content: TetraEmbedContent) {
    const details = this.__transform(content);
    const embedTitle = getEmojiTitle("🟩", details.title || "Success");

    return new EmbedBuilder({
      color: 0x3acf38,
      ...details,
      title: embedTitle,
    });
  }

  static error(content: TetraEmbedContent) {
    const details = this.__transform(content);
    const embedTitle = getEmojiTitle(
      "🟥",
      details.title || "Something went wrong"
    );

    return new EmbedBuilder({
      color: 0xeb3434,
      ...details,
      title: embedTitle,
    });
  }

  static attention(content: TetraEmbedContent) {
    const details = this.__transform(content);
    const embedTitle = getEmojiTitle("🟧", details.title || "Attention");

    return new EmbedBuilder({
      color: 0xff8812,
      ...details,
      title: embedTitle,
    });
  }

  static panel(content: TetraEmbedContent) {
    const details = this.__transform(content);
    const embedTitle = getEmojiTitle("⬜", details.title || "Tetra Panel");

    return new EmbedBuilder({
      color: 0xffffff,
      ...details,
      title: embedTitle,
    });
  }

  static warning(content: TetraEmbedContent) {
    const details = this.__transform(content);
    const embedTitle = getEmojiTitle("🟨", details.title || "Warning");

    return new EmbedBuilder({
      color: 0xf7e139,
      ...details,
      title: embedTitle,
    });
  }

  static info(content: TetraEmbedContent) {
    const details = this.__transform(content);
    const embedTitle = getEmojiTitle("🟦", details.title || "Information");

    return new EmbedBuilder({
      color: 0x0096ff,
      ...details,
      title: embedTitle,
    });
  }

  static media(content: TetraEmbedContent) {
    const details = this.__transform(content);
    const embedTitle = getEmojiTitle("🔹", details.title || "Media");

    return new EmbedBuilder({
      color: 0x40c6ff,
      ...details,
      title: embedTitle,
    });
  }

  static premium(content: TetraEmbedContent) {
    const details = this.__transform(content);
    const embedTitle = getEmojiTitle("🟪", details.title || "Tetra Premium");

    return new EmbedBuilder({
      color: 0x9538ff,
      ...details,
      title: embedTitle,
    });
  }
}
