import {
  APIEmbed,
  AttachmentBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";

import type {
  MediaOptionsWithUrl,
  MediaOptions,
  Output,
} from "get-twitter-media";

interface OutputTwitterFn extends Output {
  error?: String;
}

type TwitterFn = (
  url: string | MediaOptionsWithUrl,
  options?: MediaOptions
) => Promise<OutputTwitterFn>;

import { DiscordBot } from "../types";
import isValidURL from "../utils/isValidURL";
const getTwitterMedia: TwitterFn = require("get-twitter-media");
import fetch from "node-fetch";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("twitter")
    .setDescription("May stop working 🦦")
    .addStringOption((option) =>
      option.setName("url").setDescription("twitter url").setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    // await interaction.reply(
    //   "Command temporarily disabled due to recent changes in Twitter's policies."
    // );
    try {
      await interaction.reply("<a:PepegaLoad:1085673146939621428>");

      const _urlVideo = interaction.options.getString("url");

      if (!_urlVideo) return;

      const urlVideo = _urlVideo.replace("x.com", "twitter.com");

      const twitterData = await getTwitterMedia(urlVideo, {
        buffer: true,
        text: true,
      });

      console.log(twitterData);

      if (!twitterData.found || twitterData.error) {
        await interaction.editReply(
          `${twitterData.error || "error description not available"}`
        );
        return;
      }

      const { media, text } = twitterData;

      const twitterLink = text?.split(" ").at(-1) || "-";

      const description =
        text
          ?.split(" ")
          .slice(0, -1)
          .filter((block) => !isValidURL(block))
          .join(" ") || "-";

      if (media.length === 0) {
        await interaction.editReply(`post without media`);
        return;
      }

      await interaction.editReply({
        files: media.map((element) => new AttachmentBuilder(element.url)),
        content: `${description} *<${twitterLink}>*`,
      });
    } catch (error) {
      console.log(error);
      await interaction.editReply(`cos jeblo! ${String(error)}`);
    }
  },
};

export default importEmote;
