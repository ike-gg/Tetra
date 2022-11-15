import { ChatInputCommandInteraction, DiscordAPIError } from "discord.js";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

import emote7tv from "../emotes/emote7tv";
import { DiscordBot } from "../types";
import emoteToGuild from "../emotes/emoteToGuild";

const addEmoteLink = async (
  interaction: ChatInputCommandInteraction,
  client: DiscordBot,
  feedback: FeedbackManager
) => {
  const emoteReference = interaction.options.get("link")?.value as string;

  try {
    const emote = await emote7tv(emoteReference, feedback);
    await emoteToGuild(emote, interaction.guild!, { client, feedback });
  } catch (error: any) {
    await feedback.error(error);
  }
};

export default addEmoteLink;
