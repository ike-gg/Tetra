import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

import { FeedbackManager } from "../utils/managers/FeedbackManager";
import addEmoteLink from "../subcommands/addEmoteLink";
import addEmoteName from "../subcommands/addEmoteName";
import { DiscordBot } from "../types";

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
            .setName("exactmatch")
            .setDescription(
              "Does bot should find emotes with exact name, default is true"
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
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction);

    if (!interaction.memberPermissions!.has("ManageEmojisAndStickers")) {
      await feedback.error(
        "Ooops! It look's like you dont have permissions to manage emojis and stickers on this server!"
      );
      return;
    }

    await feedback.info("Got'ya your request!", "Working on it... 🏗️");

    const subcommandUsed = interaction.options.getSubcommand();

    switch (subcommandUsed) {
      case "bylink":
        addEmoteLink(interaction, client, feedback);
        break;
      case "byname":
        addEmoteName(interaction, client, feedback);
        break;
      default:
        feedback.error("Subcommand not supported yet.");
        break;
    }
  },
};

export default importEmote;
