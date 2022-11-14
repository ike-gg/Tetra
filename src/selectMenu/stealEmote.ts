import { SelectMenuInteraction } from "discord.js";
import { DiscordBot, ExtractedEmote } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";
import emoteDiscord from "../emotes/emoteDiscord";

const stealEmote = {
  data: { name: "stealEmote" },
  async execute(interaction: SelectMenuInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction);

    feedback.gotRequest();

    const guildId = interaction.values[0];
    const guild = await client.guilds.fetch(guildId);

    if (!guild) {
      feedback.missingGuild();
      return;
    }

    const taskId = interaction.customId;
    const taskDetails = client.tasks.getTask<TaskTypes.StealEmote>(taskId);
    const { emote } = taskDetails;

    const extractedEmote = (await emoteDiscord(emote)) as ExtractedEmote;

    try {
      const { image, name } = extractedEmote;
      const addedEmote = await guild.emojis.create({ attachment: image, name });
      await feedback.success(
        `Success!`,
        `Successfully added \`${addedEmote.name}\` emote! ${addedEmote}`,
        extractedEmote.preview
      );
    } catch (error) {
      feedback.error(String(error));
      return;
    }
  },
};

export default stealEmote;
