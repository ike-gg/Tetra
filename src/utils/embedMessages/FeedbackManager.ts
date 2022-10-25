import errorEmbed from "./errorEmbed";
import infoEmbed from "./infoEmbed";
import successfulEmbed from "./successfulEmbed";
import warningEmbed from "./warningEmbed";
import {
  ButtonInteraction,
  CommandInteraction,
  BaseMessageOptions,
} from "discord.js";
import {
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
} from "@discordjs/builders";

export class FeedbackManager {
  interaction: CommandInteraction | ButtonInteraction;
  isReplied = false;
  constructor(interaction: CommandInteraction | ButtonInteraction) {
    this.interaction = interaction;
  }

  async sendMessage(options: {
    embeds?: EmbedBuilder[];
    components?: ActionRowBuilder<ButtonBuilder>[];
  }) {
    const { embeds, components } = options;
    const messagePayload: BaseMessageOptions = {
      embeds: embeds,
      components: components,
    };

    this.isReplied = this.interaction.replied;

    this.isReplied
      ? await this.interaction.editReply(messagePayload)
      : await this.interaction.reply(messagePayload);
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
