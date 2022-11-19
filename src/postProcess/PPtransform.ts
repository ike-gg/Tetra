import { ButtonInteraction, GuildEmoji } from "discord.js";
import { DiscordBot, ExtractedEmote } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";
import emote7tv from "../emotes/emote7tv";
import emoteDiscord from "../emotes/emoteDiscord";
import emoteOptimise from "../emotes/emoteOptimise";
import editEmoteByUser from "../emotes/editEmoteByUser";

const PPtransform = async (
  interaction: ButtonInteraction,
  client: DiscordBot,
  taskId: string,
  transform: "square" | "center"
) => {
  try {
    await interaction.deferUpdate();

    const taskDetails =
      client.tasks.getTask<TaskTypes.PostProcessEmote>(taskId);

    const { feedback } = taskDetails;

    await feedback.removeButtons();
    await feedback.gotRequest();

    const { emote } = taskDetails;

    if (emote.origin === "discord") {
      await feedback.discordEmotesPP();
      return;
    }

    emote.finalData = await emoteOptimise(emote.data, {
      animated: emote.animated,
      feedback,
      transform,
    });

    await editEmoteByUser(emote, interaction.guild!, {
      client,
      feedback,
    });
  } catch (error) {
    console.error(error);
    // await feedback.error(String(error));
  }
};

export default PPtransform;
