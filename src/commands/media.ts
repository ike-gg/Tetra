import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { handleTwitterMedia } from "../utils/media/handleTwitterMedia";
import URLButton from "../utils/elements/URLButton";
import { handleInstagramMedia } from "../utils/media/handleInstagramMedia";

export interface PlatformResult {
  description: string;
  media: string[];
}

interface PlatformHandler {
  name: string;
  hostnames: string[];
  handler: (url: string) => Promise<PlatformResult>;
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
];

export default {
  data: new SlashCommandBuilder()
    .setName("media")
    .setDescription(
      "get media from various social media platforms like twitter, tiktok or instagram"
    )
    .addStringOption((option) =>
      option.setName("url").setDescription("URL to media").setRequired(true)
    ),
  // .addIntegerOption((option) =>
  //   option
  //     .setName("time")
  //     .setDescription(
  //       "set time for each slide in seconds, default 3, not required"
  //     )
  //     .setRequired(false)
  //     .setMaxValue(15)
  // ),,
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

      await feedback.warning(`Processing ${platform.name}...`);

      const { description, media } = await platform.handler(itemUrl);

      if (media.length === 0) {
        await feedback.error("No media found");
        return;
      }

      feedback.sendMessage({
        embeds: [],
        content: description.replace("\n\n", "\n"),
        files: media.map((m) => new AttachmentBuilder(m)),
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
