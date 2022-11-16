import { ChatInputCommandInteraction, SelectMenuInteraction } from "discord.js";
import { DiscordBot, ExtractedEmote } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";
import emoteDiscord from "../emotes/emoteDiscord";
import emoteToGuild from "../emotes/emoteToGuild";

const stealEmote = {
  data: { name: "stealEmote" },
  async execute(interaction: SelectMenuInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction, { ephemeral: true });

    await feedback.removeSelectMenu();
    await feedback.gotRequest();

    const guildId = interaction.values[0];
    const guild = await client.guilds.fetch(guildId);

    if (!guild) {
      feedback.missingGuild();
      return;
    }

    const taskId = interaction.customId;
    const taskDetails = client.tasks.getTask<TaskTypes.StealEmote>(taskId);
    const { emote } = taskDetails;

    try {
      const extractedEmote = (await emoteDiscord(emote)) as ExtractedEmote;
      await emoteToGuild(extractedEmote, guild, { client, feedback });
    } catch (error) {
      feedback.error(String(error));
      return;
    }
  },
};

export default stealEmote;
