import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import fetch from "node-fetch";
import { DiscordBot } from "../types";
import { TwitterDL } from "twitter-downloader";
import isValidURL from "../utils/isValidURL";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("twitter")
    .setDescription("🦦")
    .addStringOption((option) =>
      option.setName("url").setDescription("twitter url").setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    try {
      await interaction.reply("<a:PepegaLoad:1085673146939621428>");
      const urlVideo = interaction.options.getString("url");

      if (!urlVideo) return;

      const data = await TwitterDL(urlVideo);

      console.log(data);

      if (!data || !data.result || data.status === "error") {
        await interaction.editReply(`cant reach post ||${data.message}||`);
        return;
      }

      const {
        caption,
        author: { username },
      } = data.result;
      const media = data.result?.media[0];

      const twitterLink = caption.split(" ").at(-1);
      const description = caption
        .split(" ")
        .slice(0, -1)
        .filter((word) => !isValidURL(word))
        .join(" ");

      if (!media) {
        await interaction.editReply(`post without media`);
        return;
      }

      let mediaBuffer: Buffer;

      if (media.type === "video" && Array.isArray(media.result)) {
        const bestQuality = media.result.sort((a, b) => {
          const valueA = Number(a.bitrate);
          const valueB = Number(b.bitrate);
          return valueB - valueA;
        })[0];

        const source = await fetch(bestQuality.url);
        mediaBuffer = await source.buffer();
      } else if (media.type === "photo" && typeof media.result === "string") {
        const source = await fetch(media.result);
        mediaBuffer = await source.buffer();
      }

      if (!mediaBuffer!) {
        await interaction.editReply(
          "media unavailable or not supported file type"
        );
        return;
      }

      const videoAttachment = new AttachmentBuilder(mediaBuffer);

      media.type === "video" && videoAttachment.setName("video.mp4");
      media.type === "photo" && videoAttachment.setName("image.jpg");

      await interaction.editReply({
        files: [videoAttachment],
        content: `${username}: ${description} *<${twitterLink}>*`,
      });
    } catch (error) {
      console.log(error);
      await interaction.editReply(`cos jeblo! ${String(error)}`);
    }
  },
};

export default importEmote;
