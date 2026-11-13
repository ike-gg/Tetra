import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from "discord.js";

import { Messages } from "@/constants/messages";
import getBufferFromUrl from "@/emotes/source/get-buffer-from-url";
import { ChatInputCommandHandler } from "@/interactions";
import {
  handleInstagramMedia,
  handleStreamableMedia,
  handleTikTokMedia,
  handleTwitchClip,
  handleTwitterMedia,
} from "@/lib/media";
import { renderSlideshow } from "@/lib/media/helper/render-slideshow";
import { URLButton } from "@/utils/discord/components/url-button";
import { TetraEmbed } from "@/utils/embed-messages/tetra-embed";
import { formatDate } from "@/utils/format-date";
import isValidURL from "@/utils/is-valid-url";
import { FeedbackManager } from "@/utils/managers/feedback-manager";
import { removeQueryFromUrl } from "@/utils/remove-query-from-url";

export interface MediaOutput {
  type: "mp4" | "png" | "jpg";
  source: Buffer | string;
  size?: number;
}

export interface PlatformResult {
  description?: string;
  media: MediaOutput[];
  isSlideshow?: boolean;
  audio?: string;
  metadata?: {
    author?: string;
    date?: Date;
    likes?: number;
    views?: number;
  };
}

export type PlatformHandlerCallback = (
  url: string,
  feedback: FeedbackManager
) => Promise<PlatformResult>;

interface PlatformHandler {
  name: string;
  hostnames: string[];
  handler: PlatformHandlerCallback;
  color: number;
  emote: string;
}

export enum MediaCommandError {
  FILE_LIMIT_EXCEEDED,
  POST_NOT_FOUND,
  INSTAGRAM_NOT_FOUND_OR_NOT_SUPPORTED,
  REDDIT_NOT_FOUND_OR_NOT_VIDEO,
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
  }, // {
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
];

export const supportedMediaPlatforms = supportedPlatforms;

const command = new SlashCommandBuilder()
  .setName("media")
  .setDescription(
    "Download media from various social media platforms like X, Instagram, TikTok etc."
  )
  .addStringOption((option) =>
    option.setName("url").setDescription("Link to social media post:").setRequired(true)
  );

export default new ChatInputCommandHandler(command, async (interaction) => {
  const input = interaction.options.getString("url");

  if (!input) return;

  // Discord sends the real limit (guild boost level, perks) with every interaction
  const fileLimit = interaction.attachmentSizeLimit;
  const feedback = new FeedbackManager(interaction);

  const itemUrl = input.split(" ").find((i) => isValidURL(i));

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
      await feedback.error(Messages.METDIA_PLATFORM_NOT_SUPPORED);
      return;
    }

    await feedback.media({
      title: `${platform.emote}  Fetching ${platform.name}...`,
      color: platform.color,
    });

    const { description, media, metadata, isSlideshow, audio } = await platform.handler(
      itemUrl,
      feedback
    );

    const totalFilesSize = media.reduce((curr, acc) => curr + (acc.size ?? 0), 0);

    if (totalFilesSize > fileLimit) {
      await feedback.fileLimitExceeded();
      return;
    }

    const mediaToUpload: AttachmentBuilder[] = [];

    if (isSlideshow) {
      await feedback.info("Downloading slideshow assets...");

      const sources = media.filter((m) => m.type !== "mp4");
      const images = await Promise.all(
        sources.map(async (image) => {
          if (typeof image.source === "string") {
            return await getBufferFromUrl(image.source);
          }

          return image.source;
        })
      );

      const audioRawBuffer = audio ? await getBufferFromUrl(audio) : undefined;

      const audioBuffer =
        audioRawBuffer && audioRawBuffer.length > 1024 ? audioRawBuffer : undefined;

      await feedback.info("Rendering slideshow...");

      const movie = await renderSlideshow(images, audioBuffer);

      mediaToUpload.push(
        new AttachmentBuilder(movie, {
          name: `tetra_${interaction.id}.mp4`,
        })
      );
    }

    if (!isSlideshow) {
      for (const m of media) {
        mediaToUpload.push(
          new AttachmentBuilder(m.source, {
            name: `tetra_${interaction.id}.${m.type}`,
          })
        );
      }
    }

    const metadataRow = new ActionRowBuilder<ButtonBuilder>();
    const actionRow = new ActionRowBuilder<ButtonBuilder>();
    const trimmedUrl = removeQueryFromUrl(itemUrl);

    const { author, date, likes, views } = metadata || {};

    metadataRow.addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
        .setEmoji(platform.emote)
        .setLabel(platform.name)
        .setCustomId(interaction.id)
    );

    date &&
      metadataRow.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setCustomId("datemedia")
          .setEmoji({
            name: "🗓️",
          })
          .setLabel(formatDate(date))
          .setDisabled(true)
      );

    author &&
      metadataRow.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setCustomId("author")
          .setEmoji({
            name: "👤",
          })
          .setLabel(`@${author}`)
          .setDisabled(true)
      );

    views &&
      metadataRow.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setCustomId("views")
          .setEmoji({
            name: "👀",
          })
          .setLabel(String(views))
          .setDisabled(true)
      );

    likes &&
      metadataRow.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setCustomId("likes")
          .setEmoji({
            name: "👍",
          })
          .setLabel(String(likes))
          .setDisabled(true)
      );

    actionRow.addComponents(
      URLButton("Open", platform.name === "YouTube" ? itemUrl : trimmedUrl)
    );

    const components = [metadataRow];

    if (actionRow.components.length > 0) components.push(actionRow);

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
});
