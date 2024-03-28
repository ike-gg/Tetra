import { AttachmentBuilder, ButtonInteraction } from "discord.js";
import { DiscordBot } from "../types";
import * as TaskTypes from "../types/TaskTypes";
import editEmoteByUser from "../emotes/editEmoteByUser";
import { removeBackground } from "@imgly/background-removal-node";
import fs from "fs";
import { tetraTempDirectory } from "../constants";

export default async function removebg(
  interaction: ButtonInteraction,
  client: DiscordBot,
  taskId: string
) {
  try {
    await interaction.deferUpdate();

    const taskDetails =
      client.tasks.getTask<TaskTypes.PostProcessEmote>(taskId);

    const { feedback } = taskDetails;

    await feedback.removeComponents();
    await feedback.working();

    const { emote } = taskDetails;

    const tempDir = tetraTempDirectory(interaction.id);
    const tempFile = `${tempDir}/emote.png`;
    fs.writeFileSync(tempFile, emote.data);

    const editedEmote = await removeBackground(tempFile, { model: "medium" });

    const arrayBuffer = await editedEmote.arrayBuffer();
    const editedEmoteBuffer = Buffer.from(arrayBuffer);

    client.tasks.updateTask<TaskTypes.PostProcessEmote>(taskId, {
      ...taskDetails,
      emote: {
        ...taskDetails.emote,
        finalData: editedEmoteBuffer,
        slices: undefined,
      },
    });

    editEmoteByUser(taskId);
  } catch (error) {
    throw new Error(String(error));
  }
}
