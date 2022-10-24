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
  constructor(interaction: CommandInteraction | ButtonInteraction) {
    this.interaction = interaction;
  }

  private sendMessage(options: {
    embeds?: EmbedBuilder[];
    components?: ActionRowBuilder<ButtonBuilder>[];
  }) {
    const { embeds, components } = options;
    const messagePayload: BaseMessageOptions = {
      embeds: embeds,
      components: components,
    };

    const isReplied = this.interaction.replied;
    isReplied
      ? this.interaction.reply(messagePayload)
      : this.interaction.editReply(messagePayload);
  }

  info(title: string, message: string) {
    const embed = infoEmbed(title, message);
    this.sendMessage({ embeds: [embed] });
  }

  error(message: string) {
    const embed = errorEmbed(message);
    this.sendMessage({ embeds: [embed] });
  }

  success(title: string, description: string, image?: string) {
    const embed = successfulEmbed(title, description, image);
    this.sendMessage({ embeds: [embed] });
  }

  warning(message: string) {
    const embed = warningEmbed(message);
    this.sendMessage({ embeds: [embed] });
  }
}
