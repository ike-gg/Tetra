import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { Messages } from "../constants/messages";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("twitter")
    .setDescription("May stop working 🦦")
    .addStringOption((option) =>
      option.setName("url").setDescription("twitter url").setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    await new FeedbackManager(interaction).warning(Messages.NEW_MEDIA_COMMAND);
  },
};

export default importEmote;
