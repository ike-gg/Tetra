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
  Client,
  InteractionReplyOptions,
  SelectMenuBuilder,
  SelectMenuInteraction,
  InteractionUpdateOptions,
  GuildEmoji,
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

    const messagePayload: InteractionReplyOptions | InteractionUpdateOptions = {
      embeds: embeds,
      components: components,
      ephemeral,
    };

    // this.isReplied = this.interaction.replied;

    if (this.isReplied) {
      await this.interaction.editReply(messagePayload);
    } else {
      if (!(this.interaction instanceof CommandInteraction)) {
        await this.interaction.update({ embeds, components });
      } else {
        await this.interaction.reply(messagePayload);
      }
    }

    this.isReplied = true;
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

  async updateComponents(
    components: ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>[]
  ) {
    await this.sendMessage({ components: components });
  }

  async removeButtons() {
    if (this.interaction instanceof ButtonInteraction) {
      await this.sendMessage({ components: [] });
    }
  }

  async removeSelectMenu() {
    await this.sendMessage({ components: [] });
  }

  async gotRequest() {
    await this.info("Got your request!", "Working on it... 🏗️");
  }

  async interactionTimeOut() {
    await this.error(
      "This interaction has expired, that means the time you have to repsond to bot has passed."
    );
  }

  async notFoundEmotes() {
    await this.error("I couldn't find emotes in this message.");
  }

  async notFoundEmotesQuery(query: string) {
    await this.error(`I couldn't find any emotes with \`${query}\` query.`);
  }

  async moreThanOneEmote() {
    await this.error(
      "Messages contains more than one emotes is not supported yet."
    );
  }

  async emoteSameServer() {
    await this.error("This emote is from this server.");
  }

  async missingPermissions() {
    await this.error(
      "Ooops! It look's like you dont have permissions to manage emojis and stickers on this server!"
    );
  }
  async missingGuild() {
    await this.error("Ooops! I couldn't find the server, please try again.");
  }

  async missingCommonGuilds() {
    await this.error(
      "I couldn't find common servers where you have permissions to manage emotes."
    );
  }

  async selectServerSteal() {
    await this.success(
      "Got it!",
      "Now select server where you'd like to import emote.\n\nKeep in mind I must be on this server and YOU must have permission to add emotes there."
    );
  }

  async successedAddedEmote(emote: GuildEmoji) {
    await this.success(
      "Success!",
      `Successfully added \`${emote.name}\` emote! ${emote} in \`${emote.guild.name}\``,
      emote.url
    );
  }
}
