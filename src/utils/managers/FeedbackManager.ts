let env = (process.env.env as "development" | "production") || "production";

import {
  ButtonInteraction,
  CommandInteraction,
  SelectMenuBuilder,
  SelectMenuInteraction,
  GuildEmoji,
  TextChannel,
  ButtonStyle,
  BaseMessageOptions,
  isJSONEncodable,
} from "discord.js";
import {
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
} from "@discordjs/builders";

import { DiscordBot } from "../../types";
import { TetraEmbed, TetraEmbedContent } from "../embedMessages/TetraEmbed";
import { Messages } from "../../constants/messages";

export class FeedbackManager {
  client: DiscordBot;
  ephemeral: boolean;

  constructor(
    public interaction:
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction,
    options?: {
      ephemeral?: boolean;
    }
  ) {
    let ephemeral = options?.ephemeral || false;

    this.client = interaction.client as DiscordBot;
    this.ephemeral = ephemeral;
  }

  async sendMessage(content: BaseMessageOptions) {
    const { embeds } = content;

    if (embeds && embeds.length > 0) {
      const lastIndex = embeds.length - 1;
      let lastEmbedText = this.client.user!.username;

      if (env === "development") {
        lastEmbedText += " | dev";
      }

      let lastEmbedData = embeds[lastIndex];
      if (!lastEmbedData) return;
      if (isJSONEncodable(lastEmbedData))
        lastEmbedData = lastEmbedData.toJSON();

      const lastEmbedBuilder = new EmbedBuilder(lastEmbedData);
      lastEmbedBuilder.setFooter({
        text: lastEmbedText,
        iconURL: this.client.user!.avatarURL()!,
      });

      embeds[lastIndex] = lastEmbedBuilder.toJSON();
    }

    if (this.interaction.replied) {
      await this.interaction.editReply(content);
    } else {
      if (!(this.interaction instanceof CommandInteraction)) {
        await this.interaction.update(content);
      } else {
        await this.interaction.reply(content);
      }
    }
  }

  async info(content: TetraEmbedContent) {
    await this.sendMessage({ embeds: [TetraEmbed.info(content)] });
  }

  async success(content: TetraEmbedContent) {
    await this.sendMessage({ embeds: [TetraEmbed.success(content)] });
  }

  async panel(content: TetraEmbedContent) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    row.addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(`Open Tetra Panel`)
        .setURL("https://panel.tetra.lol")
    );
    await this.sendMessage({
      embeds: [TetraEmbed.panel(content)],
      components: [row],
    });
  }

  async attention(content: TetraEmbedContent) {
    await this.sendMessage({ embeds: [TetraEmbed.attention(content)] });
  }

  async warning(content: TetraEmbedContent) {
    await this.sendMessage({ embeds: [TetraEmbed.warning(content)] });
  }

  async media(content: TetraEmbedContent) {
    await this.sendMessage({ embeds: [TetraEmbed.media(content)] });
  }

  async premium(content: TetraEmbedContent) {
    await this.sendMessage({ embeds: [TetraEmbed.premium(content)] });
  }

  async error(content: TetraEmbedContent) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`errorlog`)
        .setEmoji({ name: "📠" })
        .setLabel(`Send developers log`)
        .setStyle(ButtonStyle.Danger)
    );
    await this.sendMessage({
      embeds: [TetraEmbed.error(content)],
      components: [row],
    });
  }

  async unhandledError(error: any) {
    const trackingId = crypto.randomUUID();
    console.error(`[ ${trackingId} ]`, error);
    await this.error({
      title: "Unhandled error",
      description:
        "An unhandled error has occurred. Please report this to the developers.",
      fields: [{ name: "Tracking ID", value: trackingId }],
    });
  }

  async updateComponents(
    components: ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>[]
  ) {
    await this.sendMessage({ components: components });
  }

  async removeComponents() {
    await this.sendMessage({ components: [], files: [] });
  }

  async updateFiles(files: BaseMessageOptions["files"]) {
    await this.sendMessage({ files: files });
  }

  async working() {
    await this.info(Messages.WORKING());
  }

  async interactionTimeout() {
    await this.error(Messages.INTERACTION_TIMEOUT);
  }

  async rateLimited() {
    await this.warning(Messages.RATE_LIMIT_EXCEEDED);
  }

  async notFoundEmotes() {
    await this.error(Messages.EMOTE_NOT_FOUND);
  }

  async missingPermissions() {
    await this.error(Messages.MISSING_PERMISSIONS);
  }

  async invalidReference() {
    await this.error(Messages.INVALID_REFERENCE);
  }

  //special for logging
  async logsOfUses(emote: GuildEmoji) {
    try {
      const announceChannel = (await this.client.channels.fetch(
        "1054273914437648384"
      )) as TextChannel;

      if (!announceChannel) return;

      await announceChannel.send(
        `Someone just added an emote ${emote} to their server! ${
          Math.random() > 0.8
            ? `\nTry to use \`steal\` command on this message to add emote to your server!`
            : ""
        }`
      );
    } catch (error) {
      console.error("Cant reach announcement channel");
    }
  }

  async notFoundFile() {
    await this.error("Not found any files in message.");
  }
}
