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
import { TetraEmbed } from "../utils/embedMessages/TetraEmbed";
import { handleRedditMedia } from "../utils/media/handleRedditMedia";

export interface MediaOutput {
  type: "mp4" | "png" | "jpg";
  source: Buffer | string;
  size?: number;
}

export interface PlatformResult {
  description?: string;
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
  color: number;
  emote: string;
}

export enum MediaCommandError {
  FILE_LIMIT_EXCEEDED,
}

const supportedPlatforms: PlatformHandler[] = [
  {
    name: "X",
    handler: handleTwitterMedia,
    hostnames: ["twitter.com", "x.com", "fxtwitter.com"],
    color: 0x1da1f2,
    emote: "<:_tetra_symbol_x:1245824654568984687>",
  },
  {
    name: "Instagram",
    handler: handleInstagramMedia,
    hostnames: ["instagram.com", "www.instagram.com"],
    color: 0xc32aa3,
    emote: "<:_tetra_symbol_ig:1245824656154562560>",
  },
  {
    name: "TikTok",
    handler: handleTikTokMedia,
    hostnames: ["tiktok.com", "www.tiktok.com"],
    color: 0x010101,
    emote: "<:_tetra_symbol_tiktok:1245824660726349945>",
  },
  {
    name: "Twitch",
    handler: handleTwitchClip,
    hostnames: ["twitch.tv"],
    color: 0x9146ff,
    emote: "<:_tetra_symbol_twitch:1245824662177448036>",
  },
  // {
  //   name: "YouTube",
  //   handler: handleYoutubeMedia,
  //   hostnames: ["youtube.com", "youtu.be", "www.youtube.com"],
  // },
  {
    name: "Streamable",
    handler: handleStreamableMedia,
    hostnames: ["streamable.com"],
    color: 0x007aff,
    emote: "<:_tetra_symbol_streamable:1245825591089827861>",
  },
  {
    name: "Reddit",
    handler: handleRedditMedia,
    hostnames: ["reddit.com", "redd.it"],
    color: 0xff5700,
    emote: "<:_tetra_symbol_reddit:1245824659350618212>",
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

      await feedback.media({
        title: `${platform.emote}  Fetching ${platform.name}...`,
        color: platform.color,
      });

      const { description, media, metadata } = await platform.handler(
        itemUrl,
        feedback
      );

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
          title: `${platform.emote}  Fetching ${platform.name}...`,
          description:
            "Buy Tetra Premium to remove watermark and speed up processing media.",
          color: platform.color,
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
          .setEmoji(platform.emote)
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

      const premiumRow = new ActionRowBuilder<ButtonBuilder>();

      !hasPremium &&
        mediaToUpload.length > 0 &&
        premiumRow.addComponents(getPremiumOfferingButton());

      const components = [actionRow];
      if (premiumRow.components.length > 0) components.push(premiumRow);

      if (mediaToUpload.length === 0) {
        await feedback.sendMessage({
          embeds: [
            TetraEmbed.media({
              title: platform.name,
              description: `${description}\n\n*No media found in this post.*`,
              color: platform.color,
            }),
          ],
          components,
        });
        return;
      }

      await feedback.sendMessage({
        embeds: description
          ? [
              TetraEmbed.media({
                description: description,
                color: platform.color,
                hideTitle: true,
              }),
            ]
          : [],
        files: mediaToUpload,
        components,
      });
    } catch (error) {
      if (error === MediaCommandError.FILE_LIMIT_EXCEEDED) {
        await feedback.fileLimitExceeded();
      } else {
        await feedback.handleError(error);
      }
    }
  },
};
