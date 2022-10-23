import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  DiscordAPIError,
} from "discord.js";
import extractEmote from "../emotes/extract7TV";

import messageCreator from "../utils/embedMessage/createEmbed";
import findEmotes from "../utils/findEmotes";
import isEmoteFromThisGuild from "../utils/isEmoteFromThisGuild";

const importEmote = {
  data: new ContextMenuCommandBuilder()
    .setName("Import emote here")
    .setType(ApplicationCommandType.Message),
  async execute(interaction: MessageContextMenuCommandInteraction) {
    const messageContent = interaction.targetMessage.content;
    const emotesInMessage = findEmotes(messageContent);

    if (emotesInMessage.length === 0) {
      interaction.reply(
        messageCreator.errorEmbed("No emotes found in message.")
      );
      return;
    }

    if (emotesInMessage.length === 1) {
      const emote = emotesInMessage[0];
      if (await isEmoteFromThisGuild(interaction.guild!, emote.id)) {
        interaction.reply(
          messageCreator.errorEmbed("This emote is from this server.")
        );
        return;
      }

      await interaction.reply(
        messageCreator.infoEmbed("Got'ya your request!", "Working on it... 🏗️")
      );

      extractEmote(emote.link, interaction)
        .then((emote) => {
          interaction
            .guild!.emojis.create({ attachment: emote.image, name: emote.name })
            .then(() => {
              interaction.editReply(
                messageCreator.successfulEmbed(
                  `Success!`,
                  `Successfully added \`${emote.name}\` emote!`,
                  emote.preview
                )
              );
            })
            .catch((error) => {
              const errorMessage = error as DiscordAPIError;
              interaction.editReply(
                messageCreator.errorEmbed(errorMessage.message)
              );
            });
        })
        .catch((error) => {
          interaction.editReply(messageCreator.errorEmbed(error));
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
