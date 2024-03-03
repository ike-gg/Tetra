import {
  ActionRowBuilder,
  ApplicationRoleConnectionMetadata,
  AttachmentBuilder,
  AttachmentData,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
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
import { handleTwitchClip } from "../utils/media/handleTwitchClip";
import { handleYoutubeMedia } from "../utils/media/handleYoutubeMedia";
import isValidURL from "../utils/isValidURL";
import { Messages } from "../constants/messages";
import { formatDate } from "../utils/formatDate";
import { getPremiumOfferingButton } from "../utils/elements/getPremiumOfferingButton";
import { handleStreamableMedia } from "../utils/media/handleStreamableMedia";

export interface MediaOutput {
  type: "mp4" | "png" | "jpg";
  source: Buffer | string;
  size?: number;
}

export interface PlatformResult {
  description: string;
  media: MediaOutput[];
  metadata?: {
    author?: string;
    date?: Date;
    likes?: number;
    views?: number;
  };
}

interface PlatformHandler {
  name: string;
  hostnames: string[];
  handler: (url: string, feedback: FeedbackManager) => Promise<PlatformResult>;
}

export enum MediaCommandError {
  FILE_LIMIT_EXCEEDED,
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
    hostnames: ["tiktok.com", "www.tiktok.com"],
  },
  {
    name: "Twitch",
    handler: handleTwitchClip,
    hostnames: ["twitch.tv"],
  },
  {
    name: "YouTube",
    handler: handleYoutubeMedia,
    hostnames: ["youtube.com", "youtu.be", "www.youtube.com"],
  },
  {
    name: "Streamable",
    handler: handleStreamableMedia,
    hostnames: ["streamable.com"],
  },
];

export const supportedMediaPlatforms = supportedPlatforms;
export const supportedMediaHostnames = supportedPlatforms.flatMap(
  (s) => s.hostnames
);

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
    const input = interaction.options.getString("url");

    if (!input) return;

    const { fileLimit } = guildParsePremium(interaction.guild!);
    const { hasPremium } = parseEntitlementsData(interaction);
    const feedback = new FeedbackManager(interaction);

    const itemUrl = input
      .split(" ")
      .filter((i) => isValidURL(i))
      .at(0);

    if (!itemUrl) {
      await feedback.error(Messages.INVALID_REFERENCE);
      return;
    }

    try {
      const { host } = new URL(itemUrl);

      const platform = supportedPlatforms.find((p) =>
        p.hostnames.some((hostname) => host.includes(hostname))
      );

      if (!platform) {
        feedback.error(Messages.METDIA_PLATFORM_NOT_SUPPORED);
        return;
      }

      await feedback.media({ title: `Fetching ${platform.name}...` });

      const { description, media, metadata } = await platform.handler(
        itemUrl,
        feedback
      );

      if (media.length === 0) {
        await feedback.warning(description || "No media found");
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
      const trimmedUrl = removeQueryFromUrl(removeQueryFromUrl(itemUrl));
      const { author, date, likes, views } = metadata || {};

      actionRow.addComponents(
        URLButton("Open", platform.name === "YouTube" ? itemUrl : trimmedUrl),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
          .setEmoji({ name: "ℹ️" })
          .setLabel(platform.name)
          .setCustomId(interaction.id)
      );

      date &&
        actionRow.addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId("datemedia")
            .setEmoji({ name: "🗓️" })
            .setLabel(formatDate(date))
            .setDisabled(true)
        );

      author &&
        actionRow.addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId("author")
            .setEmoji({ name: "👤" })
            .setLabel("@" + author)
            .setDisabled(true)
        );

      views &&
        actionRow.addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId("views")
            .setEmoji({ name: "👀" })
            .setLabel(String(views))
            .setDisabled(true)
        );

      likes &&
        actionRow.addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId("likes")
            .setEmoji({ name: "👍" })
            .setLabel(String(likes))
            .setDisabled(true)
        );

      const components = [actionRow];
      !hasPremium &&
        components.push(
          getPremiumOfferingButton({ withActionRowWrapper: true })
        );

      await feedback.sendMessage({
        embeds: [],
        content: description.replace("\n\n", "\n"),
        files: mediaToUpload,
        components,
      });
    } catch (error) {
      if (error === MediaCommandError.FILE_LIMIT_EXCEEDED) {
        await feedback.fileLimitExceeded();
        return;
      }
      await feedback.handleError(error);
    }
  },
};
