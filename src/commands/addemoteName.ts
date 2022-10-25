import {
  ButtonBuilder,
  CommandInteraction,
  ActionRowBuilder,
  SlashCommandBuilder,
  ButtonStyle,
} from "discord.js";

import messageCreator from "../utils/embedMessages/createEmbed";
import searchEmote from "../api/7tv/searchEmote";
import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";

const emojiNumbers = [`1️⃣`, `2️⃣`, `3️⃣`, `4️⃣`, `5️⃣`];

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("addemotename")
    .setDescription(
      "Enter a name, bot will finds emotes with matching name then, you choose which one you want to add."
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription(
          "Name of emote that you looking for, keep in mind that name is case sensitive!"
        )
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("exactmatch")
        .setDescription("Does bot should find emotes with exact name")
        .setRequired(false)
    ),
  // .addStringOption((option) =>
  //   option
  //     .setName("customname")
  //     .setDescription(
  //       "Type here name for emote, leave filed blank and emote will keep its name"
  //     )
  //     .setRequired(false)
  // ),
  async execute(interaction: CommandInteraction) {
    const feedback = new FeedbackManager(interaction);
    if (!interaction.memberPermissions!.has("ManageEmojisAndStickers")) {
      await feedback.error(
        "Ooops! It look's like you dont have permissions to manage emojis and stickers on this server!"
      );
      return;
    }

    const emoteReference = interaction.options.get("name")?.value as string;
    const exactmatch = interaction.options.get("exactmatch")?.value as boolean;

    searchEmote(emoteReference, 1, exactmatch)
      .then(async (foundEmotes) => {
        if (foundEmotes.length == 0) {
          await feedback.error(
            `I couldn't find any emotes with \`${emoteReference}\` query.`
          );
          return;
        }

        let buttons = new ActionRowBuilder<ButtonBuilder>();

        const emotesEmbed = foundEmotes.map((emote, index) => {
          const { host, id, name, owner, animated } = emote;
          const number = emojiNumbers[index];

          let previewUrl = `https:${host.url}/2x`;
          animated ? (previewUrl += ".gif") : (previewUrl += ".webp");

          buttons.addComponents(
            new ButtonBuilder()
              .setCustomId(
                `selectEmote:${id}:${interaction.user.id}:${
                  interaction.guild!.id
                }`
              )
              .setEmoji(number)
              .setLabel("Select")
              .setStyle(ButtonStyle.Secondary)
          );

          return messageCreator.emotePreviewEmbed({
            number,
            name,
            author: owner.display_name,
            reference: id,
            preview: previewUrl,
          });
        });

        const navigatorRow = new ActionRowBuilder<ButtonBuilder>();
        navigatorRow.addComponents(
          new ButtonBuilder()
            .setCustomId("cancelAction")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Danger)
        );

        //todo
        await feedback.sendMessage({
          embeds: emotesEmbed,
          components: [buttons, navigatorRow],
        });
      })
      .catch(async (error) => {
        await feedback.error(error);
      });
  },
};

export default importEmote;
