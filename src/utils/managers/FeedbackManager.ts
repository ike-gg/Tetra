import errorEmbed from "../embedMessages/errorEmbed";
import infoEmbed from "../embedMessages/infoEmbed";
import successfulEmbed from "../embedMessages/successfulEmbed";
import warningEmbed from "../embedMessages/warningEmbed";
import {
  ButtonInteraction,
  CommandInteraction,
  BaseMessageOptions,
  Client,
} from "discord.js";
import {
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
} from "@discordjs/builders";

export class FeedbackManager {
  interaction: CommandInteraction | ButtonInteraction;
  client!: Client;
  isReplied = false;

  constructor(interaction: CommandInteraction | ButtonInteraction) {
    this.interaction = interaction;
    this.client = interaction.client;
  }

  async sendMessage(options: {
    embeds?: EmbedBuilder[];
    components?: ActionRowBuilder<ButtonBuilder>[];
  }) {
    const { embeds, components } = options;

    if (embeds && embeds.length > 0) {
      const lastIndex = embeds.length - 1;
      embeds[lastIndex].setFooter({
        text: this.client.user!.username,
        iconURL: this.client.user!.avatarURL()!,
      });
    }

    const messagePayload: BaseMessageOptions = {
      embeds: embeds,
      components: components,
    };

    if (this.interaction instanceof ButtonInteraction) {
      this.interaction.message.edit(messagePayload);
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

  async info(title: string, message: string) {
    const embed = infoEmbed(title, message);
    await this.sendMessage({ embeds: [embed] });
  }

  async error(message: string) {
    const embed = errorEmbed(message);
    await this.sendMessage({ embeds: [embed] });
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
