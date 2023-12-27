import {
  ActionRowBuilder,
  Attachment,
  AttachmentBuilder,
  AttachmentData,
  ButtonBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { handleTwitterMedia } from "../utils/media/handleTwitterMedia";
import URLButton from "../utils/elements/URLButton";
import { handleInstagramMedia } from "../utils/media/handleInstagramMedia";
import { handleTikTokMedia } from "../utils/media/handleTikTokMedia";

export interface PlatformResult {
  description: string;
  media: string[] | Buffer;
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
        await feedback.error("No media found");
        return;
      }

      const files = Array.isArray(media)
        ? media.map((m) => {
            if (platform.name === "Instagram") {
              return new AttachmentBuilder(m, {
                ...data,
                name: `tetra_${interaction.id}.mp4`,
              });
            }
            return new AttachmentBuilder(m);
          })
        : [new AttachmentBuilder(media, data)];

      feedback.sendMessage({
        embeds: [],
        content: description.replace("\n\n", "\n"),
        files,
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            URLButton("Open", itemUrl)
          ),
        ],
      });
    } catch (error) {
      if (error instanceof Error) {
        feedback.error(error.message);
      } else {
        feedback.unhandledError(error);
      }
    }
  },
};
