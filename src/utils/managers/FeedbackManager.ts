import dotenv from "dotenv";
dotenv.config();

let env = process.env.env as "development" | "production";
if (!env) {
  env = "production";
}

import errorEmbed from "../embedMessages/errorEmbed";
import infoEmbed from "../embedMessages/infoEmbed";
import successfulEmbed from "../embedMessages/successfulEmbed";
import warningEmbed from "../embedMessages/warningEmbed";
import {
  ButtonInteraction,
  CommandInteraction,
  BaseMessageOptions,
  Client,
  InteractionReplyOptions,
  SelectMenuBuilder,
  SelectMenuInteraction,
} from "discord.js";
import {
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
} from "@discordjs/builders";

export class FeedbackManager {
  interaction: CommandInteraction | ButtonInteraction | SelectMenuInteraction;
  client!: Client;
  ephemeral: boolean;
  isReplied = false;

  constructor(
    interaction: CommandInteraction | ButtonInteraction | SelectMenuInteraction,
    ephemeral: boolean = false
  ) {
    this.interaction = interaction;
    this.client = interaction.client;
    this.ephemeral = ephemeral;
  }

  async sendMessage(
    options: {
      embeds?: EmbedBuilder[];
      components?: ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>[];
    },
    ephemeral: boolean = false
  ) {
    if (this.ephemeral) ephemeral = true;

    const { embeds, components } = options;

    if (embeds && embeds.length > 0) {
      const lastIndex = embeds.length - 1;
      let lastEmbedText = this.client.user!.username;
      if (env === "development") {
        lastEmbedText += " | Development stage.";
      }
      embeds[lastIndex].setFooter({
        text: lastEmbedText,
        iconURL: this.client.user!.avatarURL()!,
      });
    }

    const messagePayload: InteractionReplyOptions = {
      embeds: embeds,
      components: components,
      ephemeral,
    };

    if (this.interaction instanceof ButtonInteraction) {
      const editPayload: BaseMessageOptions = {
        embeds: embeds,
        components: components,
      };
      this.interaction.message.edit(editPayload);
      return;
    }

    this.isReplied = this.interaction.replied;

    this.isReplied
      ? await this.interaction.editReply(messagePayload)
      : await this.interaction.reply(messagePayload);
  }

  async removeButtons() {
    if (this.interaction instanceof ButtonInteraction) {
      await this.interaction.update({ components: [] });
    }
  }

  async gotRequest() {
    await this.info("Got your request!", "Working on it... 🏗️");
  }

  async missingPermissions() {
    await this.error(
      "Ooops! It look's like you dont have permissions to manage emojis and stickers on this server!"
    );
  }

  async info(title: string, message: string) {
    const embed = infoEmbed(title, message);
    await this.sendMessage({ embeds: [embed] });
  }

  async error(message: string, ephemeral: boolean = false) {
    const embed = errorEmbed(message);
    await this.sendMessage({ embeds: [embed] }, ephemeral);
  }

  async success(title: string, description: string, image?: string) {
    const embed = successfulEmbed(title, description, image);
    await this.sendMessage({ embeds: [embed] });
  }

  async warning(message: string) {
    const embed = warningEmbed(message);
    await this.sendMessage({ embeds: [embed] });
  }
}
