import { ButtonInteraction, DiscordAPIError } from "discord.js";

import emote7tv from "../emotes/emote7tv";
import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";

const selectEmote = {
  data: { name: "selectEmote" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction);
    //selectemote data structure
    //identifier:emotereference:userid:guildid
    const taskId = interaction.customId;

    console.log(interaction.message.components);

    console.log(client.tasks);

    const taskDetails = client.tasks.getTask(taskId);
    const emoteReference = taskDetails?.emoteReference;

    await feedback.removeButtons();
    await feedback.info("Got'ya your request!", "Working on it... 🏗️");

    try {
      const emote = await emote7tv(emoteReference, feedback);

      const addedEmote = await interaction.guild?.emojis.create({
        attachment: emote.image,
        name: emote.name,
      });

      await feedback.success(
        `Success!`,
        `Successfully added \`${addedEmote?.name}\` emote! ${addedEmote}`,
        emote.preview
      );
    } catch (error: any) {
      feedback.error(error);
    }
  },
};

export default selectEmote;
