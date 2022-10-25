import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  DiscordAPIError,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";
import findEmotesFromMessage from "../utils/findEmotesFromMessage";
import isEmoteFromThisGuild from "../utils/isEmoteFromThisGuild";
import emoteDiscord from "../emotes/emoteDiscord";
import createEmbed from "../utils/embedMessages/createEmbed";

import { ExtractedEmote } from "../types";

const importEmote = {
  data: new ContextMenuCommandBuilder()
    .setName("Import emote here")
    .setType(ApplicationCommandType.Message),
  async execute(interaction: MessageContextMenuCommandInteraction) {
    const feedback = new FeedbackManager(interaction);

    const messageContent = interaction.targetMessage.content;
    const emotes = findEmotesFromMessage(messageContent);

    if (emotes.length === 0) {
      feedback.error("No emotes found in message.");
      return;
    }

    if (emotes.length === 1) {
      const emote = emotes[0];

      if (await isEmoteFromThisGuild(interaction.guild!, emote.id)) {
        feedback.error("This emote is from this server.");
        return;
      }

      feedback.info("Got'ya your request!", "Working on it... 🏗️");

      try {
        const extractedEmote = (await emoteDiscord(emote)) as ExtractedEmote;

        await interaction
          .guild!.emojis.create({
            attachment: extractedEmote.image,
            name: extractedEmote.name,
          })
          .then(async () => {
            feedback.success(
              `Success!`,
              `Successfully added \`${extractedEmote.name}\` emote!`,
              extractedEmote.preview
            );
          })
          .catch(async (error) => {
            const errorMessage = error as DiscordAPIError;
            feedback.error(errorMessage.message);
          });
      } catch (error: any) {
        feedback.error(error);
      }
    }

    if (emotes.length > 1) {
      try {
        feedback.info("Got'ya your request!", "Working on it... 🏗️");

        const extractedEmotes = (await emoteDiscord(
          emotes
        )) as ExtractedEmote[];

        let buttons = new ActionRowBuilder<ButtonBuilder>();

        const emotesEmbed = extractedEmotes
          .filter((exEmote) => {
            return isEmoteFromThisGuild(interaction.guild!, exEmote.id!);
          })
          .map((exEmote, index) => {
            buttons.addComponents(
              new ButtonBuilder()
                .setEmoji("🛠️")
                .setLabel(exEmote.name)
                .setStyle(ButtonStyle.Primary)
                .setCustomId(exEmote.id!)
            );
            return createEmbed.emotePreviewEmbed({
              number: index.toString(),
              name: exEmote.name,
              reference: exEmote.id!,
              preview: exEmote.preview,
            });
          });
        feedback.sendMessage({
          embeds: emotesEmbed,
          components: [buttons],
        });
      } catch (error: any) {
        feedback.error(error);
      }
    }
  },
};

export default importEmote;
