import { ButtonInteraction, DiscordAPIError } from "discord.js";

import extractEmote from "../emotes/extract7TV";
import messageCreator from "../utils/embedMessage/createEmbed";

const ping = {
  data: { name: "selectEmote" },
  async execute(interaction: ButtonInteraction) {
    //selectemote data structure
    //function:emotereference:userid:guildid
    const [, emoteReference, userId, guildId] = interaction.customId.split(":");
    extractEmote(emoteReference, interaction)
      .then((emote) => {
        // customName ? (emote.name = customName) : null;
        interaction
          .guild!.emojis.create({ attachment: emote.image, name: emote.name })
          .then(() => {
            interaction.message.edit(
              messageCreator.successfulEmbed(
                `Success!`,
                `Successfully added \`${emote.name}\` emote!`,
                emote.preview
              )
            );
          })
          .catch((error) => {
            const errorMessage = error as DiscordAPIError;
            interaction.message.edit(
              messageCreator.errorEmbed(errorMessage.message)
            );
          });
      })
      .catch((error) => {
        interaction.message.edit(messageCreator.errorEmbed(error));
      });
  },
};

export default ping;
