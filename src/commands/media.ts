import {
  ActionRowBuilder,
  AttachmentBuilder,
  AttachmentData,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  GuildPremiumTier,
  SlashCommandBuilder,
} from "discord.js";

import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { handleTwitterMedia } from "../utils/media/handleTwitterMedia";
import URLButton from "../utils/elements/URLButton";
import { handleInstagramMedia } from "../utils/media/handleInstagramMedia";
import { handleTikTokMedia } from "../utils/media/handleTikTokMedia";
import { removeQueryFromUrl } from "../utils/removeQueryFromUrl";
import { watermarkVideo } from "../utils/media/watermarkVideo";
import fetch from "node-fetch";
import { guildParsePremium } from "../utils/discord/guildParsePremium";
import { watermarkImage } from "../utils/media/watermarkImage";
import { parseEntitlementsData } from "../utils/discord/parseEntitlementsData";

export interface MediaOutput {
  type: "mp4" | "png" | "jpg";
  source: Buffer | string;
  size?: number;
}

export interface PlatformResult {
  description: string;
  media: MediaOutput[];
  data?: AttachmentData;
}

interface PlatformHandler {
  name: string;
  hostnames: string[];
  handler: (url: string, feedback: FeedbackManager) => Promise<PlatformResult>;
}

const supportedPlatforms: PlatformHandler[] = [
  {
    name: "Twitter",
    handler: handleTwitterMedia,
    hostnames: ["twitter.com", "x.com", "fxtwitter.com"],
  },
  {
    name: "Instagram",
    handler: handleInstagramMedia,
    hostnames: ["instagram.com", "www.instagram.com"],
  },
  {
    name: "TikTok",
    handler: handleTikTokMedia,
    hostnames: ["tiktok.com"],
  },
];

export default {
  data: new SlashCommandBuilder()
    .setName("media")
    .setDescription(
      "get media from various social media platforms like twitter, tiktok or instagram"
    )
    .addStringOption((option) =>
      option.setName("url").setDescription("URL to media").setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("time")
        .setDescription(
          "Set time for each slide (only applies to slide tiktoks)"
        )
        .setRequired(false)
        .setMaxValue(12)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    const itemUrl = interaction.options.getString("url");

    if (!itemUrl) return;

    const { fileLimit } = guildParsePremium(interaction.guild!);
    const { hasPremium } = parseEntitlementsData(interaction);
    const feedback = new FeedbackManager(interaction);

    try {
      const { host } = new URL(itemUrl);

      const platform = supportedPlatforms.find((p) =>
        p.hostnames.some((hostname) => host.includes(hostname))
      );

      if (!platform) {
        feedback.error("This platform is not supported");
        return;
      }

      await feedback.media({ title: `Fetching ${platform.name}...` });

      const { description, media, data } = await platform.handler(
        itemUrl,
        feedback
      );

      if (media.length === 0) {
        await feedback.error(description || "No media found");
        return;
      }

      const totalFilesSize = media.reduce(
        (curr, acc) => curr + (acc.size ?? 0),
        0
      );

      if (totalFilesSize > fileLimit) {
        await feedback.fileLimitExceeded();
        return;
      }

      let mediaToUpload: AttachmentBuilder[] = [];

      if (!hasPremium) {
        await feedback.media({
          title: `Fetching ${platform.name}...`,
          description:
            "Buy Tetra Premium to remove watermark and speed up processing media.",
        });
      }

      await Promise.all(
        media.map(async (m) => {
          if (hasPremium) {
            mediaToUpload.push(
              new AttachmentBuilder(m.source, {
                name: `tetra_${interaction.id}.${m.type}`,
              })
            );
            return;
          }

          let mediaBuffer: Buffer;

          if (typeof m.source === "string") {
            const response = await fetch(m.source);
            mediaBuffer = await response.buffer();
          } else {
            mediaBuffer = m.source;
          }

          let watermarkedBuffer =
            m.type === "mp4"
              ? await watermarkVideo(mediaBuffer, interaction.id)
              : await watermarkImage(mediaBuffer);

          mediaToUpload.push(
            new AttachmentBuilder(watermarkedBuffer, {
              name: `tetra_${interaction.id}.${m.type}`,
            })
          );
        })
      );

      const actionRow = new ActionRowBuilder<ButtonBuilder>();

      actionRow.addComponents(
        URLButton("Open", removeQueryFromUrl(itemUrl)),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
          .setEmoji({ name: "ℹ️" })
          .setLabel(platform.name)
          .setCustomId(interaction.id)
      );

      !hasPremium &&
        actionRow.addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setCustomId("premiumoffering")
            .setEmoji({ name: "⭐" })
            .setLabel("Remove watermark")
        );

      await feedback.sendMessage({
        embeds: [],
        content: description.replace("\n\n", "\n"),
        files: mediaToUpload,
        components: [actionRow],
      });
    } catch (error) {
      console.log(error);
      await feedback.handleError(error);
    }
  },
};
