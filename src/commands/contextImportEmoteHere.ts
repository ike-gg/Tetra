import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  DiscordAPIError,
} from "discord.js";

import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";
import findEmotesFromMessage from "../utils/findEmotesFromMessage";
import isEmoteFromThisGuild from "../utils/isEmoteFromThisGuild";
import emoteDiscord from "../emotes/emoteDiscord";

import { ExtractedEmote } from "../types";

const importEmote = {
  data: new ContextMenuCommandBuilder()
    .setName("Import emote here")
    .setType(ApplicationCommandType.Message),
  async execute(interaction: MessageContextMenuCommandInteraction) {
    const feedback = new FeedbackManager(interaction);

    const messageContent = interaction.targetMessage.content;
    const emotes = findEmotesFromMessage(messageContent);

    await feedback.info("Got'ya your request!", "Working on it... 🏗️");

    if (emotes.length === 0) {
      await feedback.error("No emotes found in message.");
      return;
    }

    if (emotes.length === 1) {
      const emote = emotes[0];

      if (await isEmoteFromThisGuild(interaction.guild!, emote.id)) {
        await feedback.error("This emote is from this server.");
        return;
      }

      try {
        const extractedEmote = (await emoteDiscord(emote)) as ExtractedEmote;

        await interaction
          .guild!.emojis.create({
            attachment: extractedEmote.image,
            name: extractedEmote.name,
          })
          .then(async () => {
            await feedback.success(
              `Success!`,
              `Successfully added \`${extractedEmote.name}\` emote!`,
              extractedEmote.preview
            );
          })
          .catch(async (error) => {
            const errorMessage = error as DiscordAPIError;
            await feedback.error(errorMessage.message);
          });
      } catch (error: any) {
        await feedback.error(error);
      }
    }

    if (emotes.length > 1) {
      await feedback.error(
        "Messages includes more than 1 emote is not supported yet."
      );
    }
  },
};

export default importEmote;
