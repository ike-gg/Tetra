import { ButtonInteraction, DiscordAPIError } from "discord.js";

import emote7tv from "../emotes/emote7tv";
import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";

const selectEmote = {
  data: { name: "selectEmote" },
  async execute(interaction: ButtonInteraction) {
    const feedback = new FeedbackManager(interaction);
    //selectemote data structure
    //identifier:emotereference:userid:guildid
    const [, emoteReference, userId, guildId] = interaction.customId.split(":");
    await interaction.update({ components: [] });
    await feedback.info("Got'ya your request!", "Working on it... 🏗️");
    emote7tv(emoteReference, feedback)
      .then((emote) => {
        // customName ? (emote.name = customName) : null;
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
  },
};

export default selectEmote;
