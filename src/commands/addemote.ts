import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  DiscordAPIError,
} from "discord.js";
import extractEmote from "../emotes/extractEmote";

import messageCreator from "../utils/embedMessages/createEmbed";
import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";
import findEmotes from "../utils/findEmotes";
import isEmoteFromThisGuild from "../utils/isEmoteFromThisGuild";

const importEmote = {
  data: new ContextMenuCommandBuilder()
    .setName("Import emote here")
    .setType(ApplicationCommandType.Message),
  async execute(interaction: MessageContextMenuCommandInteraction) {
    const feedback = new FeedbackManager(interaction);
    const messageContent = interaction.targetMessage.content;
    const emotesInMessage = findEmotes(messageContent);

    if (emotesInMessage.length === 0) {
      feedback.error("No emotes found in message.");
      return;
    }

    if (emotesInMessage.length === 1) {
      const emote = emotesInMessage[0];
      if (await isEmoteFromThisGuild(interaction.guild!, emote.id)) {
        feedback.error("This emote is from this server.");
        return;
      }

      await feedback.info("Got'ya your request!", "Working on it... 🏗️");

      extractEmote(emote.link, feedback)
        .then((emote) => {
          interaction
            .guild!.emojis.create({ attachment: emote.image, name: emote.name })
            .then(() => {
              feedback.success(
                `Success!`,
                `Successfully added \`${emote.name}\` emote!`,
                emote.preview
              );
            })
            .catch((error) => {
              const errorMessage = error as DiscordAPIError;
              feedback.error(errorMessage.message);
            });
        })
        .catch((error) => {
          feedback.error(error);
        });
    }

    if (await isEmoteFromThisGuild(interaction.guild!, emotesInMessage[0].id)) {
      interaction.reply("TRUE");
    } else {
      interaction.reply("FALSE");
    }
    // if (emotesInMessage[0]) {
    //   interaction.reply(emotesInMessage[0].id);
    // } else {
    //   interaction.reply("not found");
    // }
  },
};

export default importEmote;
