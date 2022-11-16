import { ButtonInteraction, GuildEmoji } from "discord.js";
import { DiscordBot, ExtractedEmote } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import * as TaskTypes from "../types/TaskTypes";
import emote7tv from "../emotes/emote7tv";
import emoteDiscord from "../emotes/emoteDiscord";
import emoteOptimise from "../emotes/emoteOptimise";
import emoteToGuild from "../emotes/emoteToGuild";

const PPtransform = async (
  interaction: ButtonInteraction,
  client: DiscordBot,
  details: {
    feedback: FeedbackManager;
    transform: "square" | "center";
    taskId: string;
  }
) => {
  const { feedback, transform, taskId } = details;

  await feedback.removeButtons();
  await feedback.gotRequest();

  const taskDetails = client.tasks.getTask<TaskTypes.PostProcessEmote>(taskId);

  const { emote } = taskDetails;

  try {
    await taskDetails.emoteGuild.delete();

    if (emote.origin === "discord") {
      await feedback.discordEmotesPP();
      return;
    }

    const rawEmote = await emote7tv(emote.id!, feedback);

    const bufferEmote = await emoteOptimise(rawEmote.image, {
      animated: rawEmote.animated,
      feedback,
      transform,
    });

    const newEmote = {
      author: rawEmote.author,
      name: rawEmote.name,
      image: bufferEmote,
      preview: rawEmote.preview,
      animated: rawEmote.animated,
      origin: rawEmote.origin,
    };

    await emoteToGuild(newEmote, interaction.guild!, { client, feedback });
  } catch (error) {
    await feedback.error(String(error));
  }
};

export default PPtransform;
