import { ChatInputCommandInteraction, DiscordAPIError } from "discord.js";
import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";

import emote7tv from "../emotes/emote7tv";

const addEmoteLink = async (
  interaction: ChatInputCommandInteraction,
  feedback: FeedbackManager
) => {
  const emoteReference = interaction.options.get("link")?.value as string;

  emote7tv(emoteReference, feedback)
    .then((emote) => {
      interaction
        .guild!.emojis.create({ attachment: emote.image, name: emote.name })
        .then(async () => {
          await feedback.success(
            `Success!`,
            `Successfully added \`${emote.name}\` emote!`,
            emote.preview
          );
        })
        .catch(async (error) => {
          const errorMessage = error as DiscordAPIError;
          await feedback.error(errorMessage.message);
        });
    })
    .catch(async (error) => {
      await feedback.error(error);
    });
};

export default addEmoteLink;
