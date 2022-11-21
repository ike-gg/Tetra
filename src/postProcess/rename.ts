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
import * as TaskTypes from "../types/TaskTypes";
import editEmoteByUser from "../emotes/editEmoteByUser";

const rename = async (
  interaction: ButtonInteraction,
  client: DiscordBot,
  taskId: string
) => {
  const identificator = randomBytes(8).toString("hex");

  const taskDetails = client.tasks.getTask<TaskTypes.PostProcessEmote>(taskId);

  const { emote, feedback, guild } = taskDetails;

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
      feedback.isReplied = true;

      await feedback.removeButtons();
      await feedback.gotRequest();

      const newName = await interaction.fields.getTextInputValue("newname");

      emote.name = newName;

      await editEmoteByUser(emote, guild, {
        client,
        feedback,
      });
    } catch (error) {
      await feedback.error(String(error));
    }

    collector.stop("received value");
  });
};

export default rename;
