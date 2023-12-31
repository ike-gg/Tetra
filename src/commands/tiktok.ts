// -------------------
//
// command deprecated
//
// -------------------

import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { Messages } from "../constants/messages";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription("tiktacz")
    .addStringOption((option) =>
      option.setName("url").setDescription("tiktok url").setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("time")
        .setDescription(
          "set time for each slide in seconds, default 3, not required"
        )
        .setRequired(false)
        .setMaxValue(15)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    await new FeedbackManager(interaction).warning(Messages.NEW_MEDIA_COMMAND);
  },
};

export default importEmote;
