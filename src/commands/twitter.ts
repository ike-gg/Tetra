import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
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

      const urlVideo = interaction.options.getString("url");

      if (!urlVideo) return;

      const twitterData = await getTwitterMedia(urlVideo, {
        buffer: true,
        text: true,
      });

      console.log(twitterData);

      if (!twitterData.found) {
        await interaction.editReply(
          `${twitterData.error || "error description not available"}`
        );
      }

      const { media, text } = twitterData;
      const firstMedia = media[0];
      const isVideo = firstMedia.url.endsWith("mp4");

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

      let source = await fetch(firstMedia.url);
      let mediaBuffer = await source.buffer();

      if (!mediaBuffer) {
        await interaction.editReply(
          "media unavailable or not supported file type"
        );
        return;
      }

      const fileAttachment = new AttachmentBuilder(mediaBuffer);
      isVideo && fileAttachment.setName("video.mp4");
      !isVideo && fileAttachment.setName("image.jpg");

      await interaction.editReply({
        files: [fileAttachment],
        content: `${description} *<${twitterLink}>*`,
      });
    } catch (error) {
      console.log(error);
      await interaction.editReply(`cos jeblo! ${String(error)}`);
    }
  },
};

export default importEmote;
