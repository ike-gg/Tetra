import { ModalBuilder, TextInputBuilder } from "@discordjs/builders";
import { randomBytes } from "crypto";
import {
  ActionRowBuilder,
  ButtonInteraction,
  Client,
  GuildEmoji,
  InteractionCollector,
  TextInputStyle,
} from "discord.js";
import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

const PPrename = async (
  interaction: ButtonInteraction,
  client: DiscordBot,
  details: {
    feedback: FeedbackManager;
    emote: GuildEmoji;
  }
) => {
  const identificator = randomBytes(8).toString("hex");

  const { emote, feedback } = details;

  const modal = new ModalBuilder()
    .setCustomId(identificator)
    .setTitle("Change name for emote");

  const newNameField = new TextInputBuilder()
    .setCustomId("newname")
    .setLabel("New name")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(28)
    .setMinLength(2)
    .setRequired(true)
    .setValue(emote.name!);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(newNameField)
  );

  await interaction.showModal(modal);

  const collector = new InteractionCollector(client as Client, {
    time: 1000 * 60 * 10,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (!(interaction.customId === identificator)) return;
    try {
      await interaction.deferUpdate();
      await feedback.gotRequest();

      const newName = interaction.fields.getTextInputValue("newname");
      await emote.edit({ name: newName });
      await feedback.successedEditedEmote(emote);
    } catch (error) {
      await feedback.error(String(error));
    }

    collector.stop("received value");
  });
};

export default PPrename;
