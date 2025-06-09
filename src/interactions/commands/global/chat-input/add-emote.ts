import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { ChatInputCommandHandler } from "@/interactions";
import { addEmoteChannel } from "@/interactions/subcommands/add-emote-by-channel";
import { addEmoteLink } from "@/interactions/subcommands/add-emote-by-link";
import { addEmoteName } from "@/interactions/subcommands/add-emote-by-name";
import addSubEmoteChannel from "@/interactions/subcommands/add-sub-emote-by-channel";
import { TetraClient } from "@/types";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

const command = new SlashCommandBuilder()
  .setName("addemote")
  .setDescription("Add emote using name, url or Twitch channel name.")
  //subcommand byname
  .addSubcommand((subcommand) =>
    subcommand
      .setName("byname")
      .setDescription(
        "Use emote name to search emotes, select source of emotes- default is 7TV."
      )
      .addStringOption((option) =>
        option.setName("name").setDescription("Enter emote name:").setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("source")
          .setDescription("Select source of emotes:")
          .addChoices(
            {
              name: "7TV",
              value: "7tv",
            },
            {
              name: "BTTV",
              value: "bttv",
            },
            {
              name: "FFZ",
              value: "ffz",
            }
          )
          .setRequired(false)
      )
  )
  //subcommand bylink
  .addSubcommand((subcommand) =>
    subcommand
      .setName("bylink")
      .setDescription(
        "Use link to add emote, supports 7TV, BTTV, FFZ and direct links to the images."
      )
      .addStringOption((option) =>
        option
          .setName("link")
          .setDescription("Enter link to the emote:")
          .setRequired(true)
      )
  )
  //subcommand bychannel
  .addSubcommand((subcommand) =>
    subcommand
      .setName("bychannel")
      .setDescription("Use Twitch channel name to fetch emotes from it.")
      .addStringOption((option) =>
        option
          .setName("channel")
          .setDescription("Enter Twitch channel name:")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("search").setDescription("Enter search query:").setRequired(false)
      )
  )
  //subcommand subemotesbychannel
  .addSubcommand((subcommand) =>
    subcommand
      .setName("subemotes")
      .setDescription("Use Twitch channel name to fetch subemotes from it.")
      .addStringOption((option) =>
        option
          .setName("channel")
          .setDescription("Enter Twitch channel name:")
          .setRequired(true)
      )
  );

export default new ChatInputCommandHandler(
  command,
  async (interaction: ChatInputCommandInteraction, client: TetraClient) => {
    const feedback = new FeedbackManager(interaction);

    if (!interaction.memberPermissions?.has("ManageEmojisAndStickers")) {
      await feedback.missingPermissions();
      return;
    }

    await feedback.working();

    const subcommandUsed = interaction.options.getSubcommand();

    switch (subcommandUsed) {
      case "bylink":
        addEmoteLink(interaction, client, feedback);
        break;
      case "byname":
        addEmoteName(interaction, client, feedback);
        break;
      case "bychannel":
        addEmoteChannel(interaction, client, feedback);
        break;
      case "subemotes":
        addSubEmoteChannel(interaction, client, feedback);
        break;
      default:
        feedback.error("Subcommand not supported yet.");
        break;
    }
  }
);
