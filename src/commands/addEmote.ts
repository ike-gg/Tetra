import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { FeedbackManager } from "../utils/managers/FeedbackManager";
import addEmoteLink from "../subcommands/addEmoteLink";
import addEmoteName from "../subcommands/addEmoteName";
import { DiscordBot } from "../types";
import addEmoteChannel from "../subcommands/addEmoteChannel";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("addemote")
    .setDescription(
      "Add emote using various resources. (Supports 7TV, BTTV, FFZ, Twitch and source URLs)"
    )
    //subcommand byname
    .addSubcommand((subcommand) =>
      subcommand
        .setName("byname")
        .setDescription(
          "Search using emote name, select source of emotes, default 7TV."
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription("Name of emote, keep in mind about case sensitive!")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("source")
            .setDescription("Source of emotes, default 7TV")
            .addChoices(
              { name: "7TV", value: "7tv" },
              { name: "BTTV", value: "bttv" },
              { name: "FFZ", value: "ffz" }
            )
            .setRequired(false)
        )
    )
    //subcommand bylink
    .addSubcommand((subcommand) =>
      subcommand
        .setName("bylink")
        .setDescription(
          "Add emote using URL. Supports 7TV, BTTV, FFZ and direct links to the image."
        )
        .addStringOption((option) =>
          option
            .setName("link")
            .setDescription(
              "Provide URL to the emote. Supports 7TV, BTTV, FFZ and direct links to the images."
            )
            .setRequired(true)
        )
    )
    //subcommand bychannel
    .addSubcommand((subcommand) =>
      subcommand
        .setName("bychannel")
        .setDescription("Fetch 7TV emote set from Twitch channel.")
        .addStringOption((option) =>
          option
            .setName("channelname")
            .setDescription("Name of the twitch channel")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("search")
            .setDescription("Filter emote names with this value")
            .setRequired(false)
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

    await feedback.gotRequest();

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
      default:
        feedback.error("Subcommand not supported yet.");
        break;
    }
  },
};

export default importEmote;
