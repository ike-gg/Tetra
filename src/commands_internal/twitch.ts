import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { FeedbackManager } from "../utils/managers/FeedbackManager";
import addEmoteLink from "../subcommands/addEmoteLink";
import addEmoteName from "../subcommands/addEmoteName";
import { DiscordBot } from "../types";
import addEmoteChannel from "../subcommands/addEmoteChannel";
import { subscribe } from "diagnostics_channel";
import { TwitchManager } from "../utils/managers/TwitchManager";
import { rawDataSymbol } from "@twurple/common";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("twitch")
    .setDescription("twitch utility")
    //subcommand byname
    .addSubcommand((subcommand) =>
      subcommand
        .setName("title")
        .setDescription("get current title of twitch channel")
        .addStringOption((option) =>
          option
            .setName("channel")
            .setDescription("twitch channel")
            .setRequired(true)
        )
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction);

    await feedback.working();

    const subcommandUsed = interaction.options.getSubcommand();

    if (subcommandUsed === "title") {
      const channel = interaction.options.getString("channel")!;
      const twitchChannel = await TwitchManager.getChannelInfo(channel);

      console.log("--->", twitchChannel?.[rawDataSymbol]);
    }
  },
};

export default importEmote;
