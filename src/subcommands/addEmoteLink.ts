import { ChatInputCommandInteraction, DiscordAPIError } from "discord.js";
import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";

import emote7tv from "../emotes/emote7tv";
import { DiscordBot } from "../types";

const addEmoteLink = async (
  interaction: ChatInputCommandInteraction,
  client: DiscordBot,
  feedback: FeedbackManager
) => {
  const emoteReference = interaction.options.get("link")?.value as string;

  try {
    const emote = await emote7tv(emoteReference, feedback);

    await interaction.guild?.emojis.create({
      attachment: emote.image,
      name: emote.name,
    });

    await feedback.success(
      `Success!`,
      `Successfully added \`${emote.name}\` emote! ${emote}`,
      emote.preview
    );
  } catch (error: any) {
    await feedback.error(error);
  }
};

export default addEmoteLink;
