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
      "Add emote using command, by provided value like name or reference (link to 7TV website to emote)."
    )
    //subcommand byname
    .addSubcommand((subcommand) =>
      subcommand
        .setName("byname")
        .setDescription(
          "Use name, it will show you emotes that matches with provided name."
        )
        .addStringOption((option) =>
          option
            .setName("name")
            .setDescription(
              "Name of emote that you looking for, keep in mind that name is case sensitive!"
            )
            .setRequired(true)
        )
        .addBooleanOption((option) =>
          option
            .setName("ignoretags")
            .setDescription(
              "While searching bot will not look at tags, so results will be more adequate to name"
            )
            .setRequired(false)
        )
    )
    //subcommand bylink
    .addSubcommand((subcommand) =>
      subcommand
        .setName("bylink")
        .setDescription(
          "Use link, provide reference to emote like link to emote on 7TV website or its identificator"
        )
        .addStringOption((option) =>
          option
            .setName("link")
            .setDescription(
              "Reference to emote: link to emote on 7tv website or its identificator."
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("bychannel")
        .setDescription("Use Twitch Channel to fetch 7TV emotes from it.")
        .addStringOption((option) =>
          option
            .setName("channelname")
            .setDescription("Name of the twitch channel")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("search")
            .setDescription(
              "Get emotes whose names contain the text from the search value"
            )
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
