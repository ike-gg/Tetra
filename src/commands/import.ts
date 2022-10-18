import {
  CommandInteraction,
  DiscordAPIError,
  ErrorEvent,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";
import extractEmote from "../emotes/extract7TV";

import messageCreator from "../utils/embedMessage/createEmbed";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("import")
    .setDescription("Import emote from 7TV to this server")
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
      interaction.reply({
        embeds: [
          messageCreator.errorEmbed(
            "Ooops! It look's like you dont have permissions to manage emojis and stickers on this server!"
          ),
        ],
      });
      return;
    }

    interaction.reply({
      embeds: [
        messageCreator.infoEmbed("Got'ya homie!", "Working on your request..."),
      ],
    });

    const emoteReference = interaction.options.get("link")?.value as string;
    const customName = interaction.options.get("name")?.value as string;

    extractEmote(emoteReference)
      .then((emote) => {
        customName ? (emote.name = customName) : "";
        interaction
          .guild!.emojis.create({ attachment: emote.image, name: emote.name })
          .then((fulfilled) => {
            interaction.editReply({
              embeds: [
                messageCreator
                  .successfulEmbed(
                    `Success!`,
                    `Successfully added ${emote.name} emote!`
                  )
                  .setImage(emote.preview),
              ],
            });
          })
          .catch((error) => {
            const errorMessage = error as DiscordAPIError;
            interaction.editReply({
              embeds: [messageCreator.errorEmbed(errorMessage.message)],
            });
          });
      })
      .catch((error) => {
        interaction.editReply({
          embeds: [messageCreator.errorEmbed(error)],
        });
      });
  },
};

export default importEmote;
