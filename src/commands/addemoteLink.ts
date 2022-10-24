import {
  CommandInteraction,
  DiscordAPIError,
  SlashCommandBuilder,
} from "discord.js";

import extractEmote from "../emotes/extractEmote";
import messageCreator from "../utils/embedMessages/createEmbed";
import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";

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
    const feedback = new FeedbackManager(interaction);
    if (!interaction.memberPermissions!.has("ManageEmojisAndStickers")) {
      feedback.error(
        "Ooops! It look's like you dont have permissions to manage emojis and stickers on this server!"
      );
      return;
    }

    await feedback.info("Got'ya your request!", "Working on it... 🏗️");

    const emoteReference = interaction.options.get("link")?.value as string;
    const customName = interaction.options.get("name")?.value as string;

    extractEmote(emoteReference, feedback)
      .then((emote) => {
        customName ? (emote.name = customName) : null;
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

export default importEmote;
