import {
  CommandInteraction,
  DiscordAPIError,
  SlashCommandBuilder,
} from "discord.js";

import extractEmote from "../emotes/extract7TV";
import messageCreator from "../utils/embedMessage/createEmbed";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("addemotelink")
    .setDescription(
      "Import emote from 7TV using reference to emote (link or ID)"
    )
    .addStringOption((option) =>
      option
        .setName("link")
        .setDescription("Insert link or ID to emote.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription(
          "Type here name for emote, leave filed blank and emote will keep its name"
        )
        .setRequired(false)
    ),
  async execute(interaction: CommandInteraction) {
    if (!interaction.memberPermissions!.has("ManageEmojisAndStickers")) {
      interaction.reply(
        messageCreator.errorEmbed(
          "Ooops! It look's like you dont have permissions to manage emojis and stickers on this server!"
        )
      );
      return;
    }

    await interaction.reply(
      messageCreator.infoEmbed("Got'ya your request!", "Working on it... 🏗️")
    );

    const emoteReference = interaction.options.get("link")?.value as string;
    const customName = interaction.options.get("name")?.value as string;

    extractEmote(emoteReference, interaction)
      .then((emote) => {
        customName ? (emote.name = customName) : null;
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
  },
};

export default importEmote;
