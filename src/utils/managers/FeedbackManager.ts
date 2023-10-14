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

import { DiscordBot, ExtractedEmote } from "../../types";
import { maxEmoteSize } from "../../constants";
import prettyBytes from "pretty-bytes";
import sharp from "sharp";
import { TetraEmbed, TetraEmbedContent } from "../embedMessages/TetraEmbed";

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
        lastEmbedText += " | Development stage.";
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

  async attention(content: TetraEmbedContent) {
    await this.sendMessage({ embeds: [TetraEmbed.attention(content)] });
  }

  async warning(content: TetraEmbedContent) {
    await this.sendMessage({ embeds: [TetraEmbed.warning(content)] });
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

  async updateComponents(
    components: ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>[]
  ) {
    await this.sendMessage({ components: components });
  }

  async removeComponents() {
    await this.sendMessage({ components: [] });
  }

  async debug() {
    const randomTexts = [
      "Abbott, Hickle and Ratke",
      "Sawayn and Sons",
      "Aufderhar - Ondricka",
      "Rutherford and Sons",
      "Mitchell, Schmitt and Balistreri",
      "Koss, Lakin and Miller",
    ];

    await this.error({
      description: randomTexts[Math.floor(Math.random() * randomTexts.length)],
    });
  }

  async editEmoteByUser(emote: ExtractedEmote) {
    let aspectRatio: number = 1;

    const emoteSharp = await sharp(emote.finalData, {
      animated: emote.animated,
    });
    const { width, height, format, pages } = await emoteSharp.metadata();

    if (format === "gif") {
      const gifHeight = (height || 1) / (pages || 1);
      aspectRatio = (width || 1) / gifHeight;
    } else {
      aspectRatio = (width || 1) / (height || 1);
    }

    const emoteBufferPreview = await emoteSharp
      .gif()
      .resize({
        width: 64,
        height: 64,
        fit: "contain",
        background: { alpha: 0.05, r: 0, g: 0, b: 0 },
      })
      .toBuffer();

    await this.sendMessage({
      files: [{ attachment: emoteBufferPreview, name: "preview.gif" }],
    });
    await this.attention({
      title: "Edit emote",
      description: `Rescale or rename your emote now.${
        aspectRatio >= 1.5 || aspectRatio <= 0.5
          ? "\n\n> It seems like your emote is a bit too wide, consider using scaling options to get best results."
          : ""
      }`,
      image: {
        url: "attachment://preview.gif",
      },
    });
  }

  async gotRequest() {
    await this.info({
      title: "Working on it",
      description: "<a:tetraLoading:1162518404557721620>",
    });
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

  async notFoundReactions() {
    await this.error("I couldn't find reactions to this message.");
  }

  async notFoundEmotesQuery(query: string) {
    await this.error(`I couldn't find any emotes with \`${query}\` query.`);
  }

  async moreThanOneEmote() {
    await this.error(
      "Messages contains more than one emotes are not supported yet."
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

  // async missingPermissionsWithRequest() {
  //   await this.warning(
  //     "Ooops! It look's like you dont have permissions to manage emojis and stickers on this server!\n\nInstead you can create request for moderators to add emote, use button below.",
  //     [EmoteRequest("xd")]
  //   );
  // }

  async missingGuild() {
    await this.error("Ooops! I couldn't find the server, please try again.");
  }

  async missingCommonGuilds() {
    await this.error(
      "I couldn't find common servers where you have permissions to manage emotes."
    );
  }

  async selectServerSteal() {
    await this.success({
      title: "Got it!",
      description:
        "Now select server where you'd like to import emote.\n\nKeep in mind I must be on this server and YOU must have permission to add emotes there.",
    });
  }

  async successedAddedEmote(emote: GuildEmoji) {
    await this.success({
      title: "Success!",
      description: `Successfully added \`${emote.name}\` emote! ${emote} in \`${emote.guild.name}\``,
      image: {
        url: emote.url,
      },
    });
  }

  async invalidReference() {
    await this.error("Invalid URL.");
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
            : ""
        }`
      );
    } catch (error) {
      console.error("Cant reach announcement channel");
    }
  }

  async exceededEmoteSize(size: number) {
    const maxSize = prettyBytes(maxEmoteSize);
    const emoteSize = prettyBytes(size);
    const differenceSize = prettyBytes(size - maxEmoteSize);
    await this.warning(`Emote exceeded maximum size.
    **${emoteSize}** / ${maxSize} *(exceeds by ${differenceSize})*

    Choose the file optimization option. If the file is large, manual correction may yield better results. However, for smaller files, automatic optimization should work well.`);
  }

  // async manualAdjustment() {
  //   const row = new ActionRowBuilder<ButtonBuilder>();
  //   const URL =
  //     env === "development"
  //       ? `http://localhost:3001/dashboard`
  //       : `https://tetra.lol/dashboard`;
  //   await this.removeButtons();
  //   await this.sendMessage({
  //     embeds: [
  //       successfulEmbed(
  //         "Manual adjustment",
  //         `You can now manually adjust the emote visiting dashboard page and authorising yourself.\n${URL}`
  //       ),
  //     ],
  //     components: [row.addComponents(URLButton("Manual adjustment", URL))],
  //   });
  // }

  async notFoundFile() {
    await this.error("Not found any files in message.");
  }
}
