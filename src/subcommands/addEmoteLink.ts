import { ChatInputCommandInteraction, DiscordAPIError } from "discord.js";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

import emote7tv from "../emotes/emote7tv";
import { DiscordBot } from "../types";
import editEmoteByUser from "../emotes/editEmoteByUser";

const addEmoteLink = async (
  interaction: ChatInputCommandInteraction,
  client: DiscordBot,
  feedback: FeedbackManager
) => {
  const emoteReference = interaction.options.get("link")?.value as string;

  try {
    const emote = await emote7tv(emoteReference, feedback);
    await editEmoteByUser(emote, interaction.guild!, {
      client,
      feedback,
      interaction,
    });
  } catch (error) {
    await feedback.error(String(error));
  }
};

export default addEmoteLink;
