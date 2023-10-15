import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

const here = {
  data: new SlashCommandBuilder()
    .setName("here")
    .setDescription("Tell the bot that you're here"),
  async execute(interaction: ChatInputCommandInteraction) {
    const feedback = new FeedbackManager(interaction, { ephemeral: true });

    // if (interaction.memberPermissions?.has("ManageEmojisAndStickers")) {
    //   feedback.success(
    //     "Success!",
    //     "Now i'm know that you are here. Now you are able to import emotes from somewhere else!"
    //   );
    // } else {
    //   feedback.warning(
    //     "Now i'm know that you are here. But you are missing the permission to manage emojis, so overall this server wont show up in list where you can import emotes.\nTry to obtain permission and then try again using `/here` command here."
    //   );
    // }
  },
};

export default here;
