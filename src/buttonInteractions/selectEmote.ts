import { ButtonInteraction, DiscordAPIError } from "discord.js";

import extractEmote from "../emotes/extractEmote";
import messageCreator from "../utils/embedMessages/createEmbed";
import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";

const selectEmote = {
  data: { name: "selectEmote" },
  async execute(interaction: ButtonInteraction) {
    const feedback = new FeedbackManager(interaction);
    //selectemote data structure
    //identifier:emotereference:userid:guildid
    const [, emoteReference, userId, guildId] = interaction.customId.split(":");
    await interaction.update({ components: [] });
    feedback.info("Got'ya your request!", "Working on it... 🏗️");
    extractEmote(emoteReference, feedback)
      .then((emote) => {
        // customName ? (emote.name = customName) : null;
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
  },
};

export default selectEmote;
