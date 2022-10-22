import { ButtonInteraction, DiscordAPIError } from "discord.js";

import extractEmote from "../emotes/extract7TV";
import messageCreator from "../utils/embedMessage/createEmbed";

const selectEmote = {
  data: { name: "selectEmote" },
  async execute(interaction: ButtonInteraction) {
    //selectemote data structure
    //identifier:emotereference:userid:guildid
    const [, emoteReference, userId, guildId] = interaction.customId.split(":");
    await interaction.update({ components: [] });
    await interaction.editReply(
      messageCreator.infoEmbed("Got'ya your request!", "Working on it... 🏗️")
    );
    extractEmote(emoteReference, interaction)
      .then((emote) => {
        // customName ? (emote.name = customName) : null;
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

export default selectEmote;
