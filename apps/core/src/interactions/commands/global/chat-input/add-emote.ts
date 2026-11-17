import { type ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { ChatInputCommandHandler } from "@/interactions";
import { addEmoteChannel } from "@/interactions/subcommands/add-emote-by-channel";
import { addEmoteLink } from "@/interactions/subcommands/add-emote-by-link";
import { addEmoteName } from "@/interactions/subcommands/add-emote-by-name";
import addSubEmoteChannel from "@/interactions/subcommands/add-sub-emote-by-channel";
import { FeedbackManager } from "@/utils/managers/feedback-manager";

const command = new SlashCommandBuilder()
  .setName("addemote")
  .setDescription("add an emote by name, link or Twitch channel")
  //subcommand byname
  .addSubcommand((subcommand) =>
    subcommand
      .setName("byname")
      .setDescription("add an emote by name from 7TV, BTTV or FFZ")
      .addStringOption((option) =>
        option.setName("name").setDescription("emote name").setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("source")
          .setDescription("where to search, 7TV by default")
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
      .setDescription("add an emote from a 7TV, BTTV or FFZ link or a direct image link")
      .addStringOption((option) =>
        option
          .setName("link")
          .setDescription("7TV, BTTV, FFZ or image link")
          .setRequired(true)
      )
  )
  //subcommand bychannel
  .addSubcommand((subcommand) =>
    subcommand
      .setName("bychannel")
      .setDescription("browse a Twitch channel's 7TV emotes")
      .addStringOption((option) =>
        option.setName("channel").setDescription("Twitch channel name").setRequired(true)
      )
      .addStringOption((option) =>
        option.setName("search").setDescription("filter by emote name").setRequired(false)
      )
  )
  //subcommand subemotesbychannel
  .addSubcommand((subcommand) =>
    subcommand
      .setName("subemotes")
      .setDescription("browse a Twitch channel's sub emotes")
      .addStringOption((option) =>
        option.setName("channel").setDescription("Twitch channel name").setRequired(true)
      )
  );

export default new ChatInputCommandHandler(
  command,
  async (interaction: ChatInputCommandInteraction) => {
    const feedback = new FeedbackManager(interaction);

    if (!interaction.memberPermissions?.has("ManageGuildExpressions")) {
      await feedback.missingPermissions();
      return;
    }

    await feedback.working();

    const subcommandUsed = interaction.options.getSubcommand();

    switch (subcommandUsed) {
      case "bylink":
        await addEmoteLink(interaction, feedback);
        break;
      case "byname":
        await addEmoteName(interaction, feedback);
        break;
      case "bychannel":
        await addEmoteChannel(interaction, feedback);
        break;
      case "subemotes":
        await addSubEmoteChannel(interaction, feedback);
        break;
      default:
        await feedback.error("that subcommand isn't supported yet");
        break;
    }
  }
);
