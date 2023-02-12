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
  InteractionReplyOptions,
  SelectMenuBuilder,
  SelectMenuInteraction,
  InteractionUpdateOptions,
  GuildEmoji,
  AttachmentPayload,
  TextChannel,
} from "discord.js";
import {
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
} from "@discordjs/builders";

import { DiscordBot, ExtractedEmote } from "../../types";
import interactionEmbed from "../embedMessages/interactionEmbed";
import emoteBorder from "../../emotes/emoteBorder";
import EmoteRequest from "../elements/emoteRequest";

export class FeedbackManager {
  interaction: CommandInteraction | ButtonInteraction | SelectMenuInteraction;
  client!: DiscordBot;
  ephemeral: boolean;
  isReplied = false;

  constructor(
    interaction: CommandInteraction | ButtonInteraction | SelectMenuInteraction,
    options?: {
      ephemeral?: boolean;
    }
  ) {
    let ephemeral = false;

    if (options?.ephemeral) ephemeral = options.ephemeral;

    this.interaction = interaction;
    this.client = interaction.client as DiscordBot;
    this.ephemeral = ephemeral;
    this.isReplied = interaction.replied;
  }

  async sendMessage(
    options: {
      embeds?: EmbedBuilder[];
      components?: ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>[];
      files?: AttachmentPayload[];
      imageInEmbed?: string;
    },
    ephemeral: boolean = false
  ) {
    if (this.ephemeral) ephemeral = true;

    const { embeds, components, files } = options;

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
      files,
      ephemeral,
    };

    // this.isReplied = this.interaction.replied;

    if (this.isReplied) {
      await this.interaction.editReply(messagePayload);
    } else {
      if (!(this.interaction instanceof CommandInteraction)) {
        await this.interaction.update({ embeds, components, files });
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

  async userInteraction(title: string, description: string, image?: string) {
    const embed = interactionEmbed(title, description, image);
    await this.sendMessage({ embeds: [embed] });
  }

  async warning(
    message: string,
    components?: ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>[]
  ) {
    const embed = warningEmbed(message);
    await this.sendMessage({ embeds: [embed], components });
  }

  async updateComponents(
    components: ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>[]
  ) {
    await this.sendMessage({ components: components });
  }

  async removeButtons() {
    await this.sendMessage({ components: [], files: [] });
  }

  async editEmoteByUser(emote: ExtractedEmote) {
    const borderedBuffer = await emoteBorder(emote.finalData, emote.animated);
    await this.sendMessage({
      files: [{ attachment: borderedBuffer, name: "preview.gif" }],
    });
    await this.userInteraction(
      "Edit emote.",
      "Now you can choose to rescale or rename your emote using buttons below.\nBorder on image will help you to imagine how the emote will looks like on chat.\n**Border will not be visible after emote is successfully uploaded!**",
      "attachment://preview.gif"
    );
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

  async discordEmotesPP() {
    await this.error(
      "Currently you can only postprocess emotes that comes from 7TV.\nEmotes from discord should be supported in the future."
    );
  }

  async rateLimited() {
    await this.warning(
      "It seems that discord has limited the bot, it will automatically continue the process when possible."
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
      "Ooops! It look's like you dont have permissions to manage emojis and stickers on this server!",
      true
    );
  }

  async missingPermissionsWithRequest() {
    await this.warning(
      "Ooops! It look's like you dont have permissions to manage emojis and stickers on this server!\n\nInstead you can create request for moderators to add emote, use button below.",
      [EmoteRequest("xd")]
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
            : null
        }`
      );
    } catch (error) {
      console.error("Cant reach announcement channel");
    }
  }

  async successedEditedEmote(emote: GuildEmoji) {
    await this.success(
      "Success!",
      `Successfully edited \`${emote.name}\` emote! ${emote} in \`${emote.guild.name}\``,
      emote.url
    );
  }
}
