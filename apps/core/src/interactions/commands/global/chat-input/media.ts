import {
  ActionRowBuilder,
  ApplicationIntegrationType,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";

import { Messages } from "@/constants/messages";
import { ChatInputCommandHandler } from "@/interactions";
import {
  handleInstagramMedia,
  handleStreamableMedia,
  handleTikTokMedia,
  handleTwitchClip,
  handleTwitterMedia,
} from "@/lib/media";
import { FileLimitExceededError } from "@/lib/media/helper/media-errors";
import type { PlatformHandlerCallback } from "@/lib/media/types";
import { URLButton } from "@/utils/discord/components/url-button";
import { TetraEmbed } from "@/utils/embed-messages/tetra-embed";
import { formatDate } from "@/utils/format-date";
import isValidURL from "@/utils/is-valid-url";
import { FeedbackManager } from "@/utils/managers/feedback-manager";
import { removeQueryFromUrl } from "@/utils/remove-query-from-url";

interface PlatformHandler {
  name: string;
  hostnames: string[];
  handler: PlatformHandlerCallback;
  color: number;
  emote: string;
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
  // Also user-installable: everything below answers through the interaction only
  .setIntegrationTypes(
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall
  )
  .setContexts(
    InteractionContextType.Guild,
    InteractionContextType.BotDM,
    InteractionContextType.PrivateChannel
  )
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
    const { hostname: host } = new URL(itemUrl);

    // Exact host or subdomain: the URL goes to yt-dlp / gallery-dl, which fetch it
    const platform = supportedPlatforms.find((p) =>
      p.hostnames.some((hostname) => host === hostname || host.endsWith(`.${hostname}`))
    );

    if (!platform) {
      await feedback.error(Messages.METDIA_PLATFORM_NOT_SUPPORED);
      return;
    }

    await feedback.media({
      title: `${platform.emote}  Fetching ${platform.name}...`,
      color: platform.color,
    });

    const { description, media, metadata } = await platform.handler(itemUrl, {
      feedback,
      fileLimit,
    });

    const totalFilesSize = media.reduce((curr, acc) => curr + (acc.size ?? 0), 0);

    if (totalFilesSize > fileLimit) throw new FileLimitExceededError();

    const mediaToUpload = media.map((m, index) => {
      const suffix = media.length > 1 ? `_${index + 1}` : "";
      return new AttachmentBuilder(m.source, {
        name: `tetra_${interaction.id}${suffix}.${m.type}`,
      });
    });

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
    await feedback.handleError(error);
  }
});
