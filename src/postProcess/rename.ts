import { ModalBuilder, TextInputBuilder } from "@discordjs/builders";
import { randomBytes } from "crypto";
import {
  ActionRowBuilder,
  ButtonInteraction,
  Client,
  InteractionCollector,
  TextInputStyle,
} from "discord.js";
import * as TaskTypes from "../types/TaskTypes";
import editEmoteByUser from "../emotes/editEmoteByUser";
import TaskManager from "../utils/managers/TaskManager";
import { client } from "..";
import parseDiscordRegexName from "../utils/discord/parseDiscordRegexName";

const rename = async (buttonInteraction: ButtonInteraction, taskId: string) => {
  const identificator = randomBytes(8).toString("hex");

  const taskDetails =
    TaskManager.getInstance().getTask<TaskTypes.PostProcessEmote>(taskId);

  const { emote, feedback } = taskDetails;
  const { interaction } = feedback;

  if (!interaction) {
    await feedback.error(
      "Something went wrong. Please try again. `INTERACTION_OBJECT_MISSING`"
    );
    return;
  }

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

  await buttonInteraction.showModal(modal);

  const collector = new InteractionCollector(client as Client<true>, {
    time: 1000 * 60 * 10,
    filter: (i) => i.user.id === interaction.user.id,
  });

  collector.on("collect", async (collectedInteraction) => {
    if (!collectedInteraction.isModalSubmit()) return;
    if (!(collectedInteraction.customId === identificator)) return;
    try {
      await collectedInteraction.deferUpdate();

      await feedback.removeComponents();
      await feedback.working();

      const newNamePlain = await collectedInteraction.fields.getTextInputValue(
        "newname"
      );

      const newName = parseDiscordRegexName(newNamePlain);

      await TaskManager.getInstance().updateTask<TaskTypes.PostProcessEmote>(
        taskId,
        {
          ...taskDetails,
          emote: {
            ...taskDetails.emote,
            name: newName,
          },
        }
      );

      await editEmoteByUser(taskId);
    } catch (error) {
      await feedback.handleError(error);
    }

    collector.stop("received value");
  });
};

export default rename;
