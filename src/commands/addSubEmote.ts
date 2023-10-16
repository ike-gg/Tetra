import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { DiscordBot } from "../types";
import addSubEmoteChannel from "../subcommands/addSubEmoteChannel";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("addsubemote")
    .setDescription("Add twitch sub emote")
    //subcommand byname
    .addSubcommand((subcommand) =>
      subcommand
        .setName("bychannel")
        .setDescription("Use Twitch Channel to fetch subemotes from it.")
        .addStringOption((option) =>
          option
            .setName("channelname")
            .setDescription("Name of the twitch channel")
            .setRequired(true)
        )
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    // const ephemeral = !interaction.memberPermissions!.has(
    //   "ManageEmojisAndStickers"
    // );
    // const feedback = new FeedbackManager(interaction, { ephemeral });

    const feedback = new FeedbackManager(interaction);

    if (!interaction.memberPermissions?.has("ManageEmojisAndStickers")) {
      await feedback.missingPermissions();
      return;
    }

    await feedback.working();

    const subcommandUsed = interaction.options.getSubcommand();

    switch (subcommandUsed) {
      case "bychannel":
        addSubEmoteChannel(interaction, client, feedback);
        break;
      default:
        feedback.error("Subcommand not supported yet.");
        break;
    }
  },
};

export default importEmote;
