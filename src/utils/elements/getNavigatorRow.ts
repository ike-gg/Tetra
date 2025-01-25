import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";
import { DiscordBot } from "../../types";
import * as TaskTypes from "../../types/TaskTypes";

const getNavigatorRow = (
  navigatorTaskId: string,
  client: DiscordBot,
  options?: {
    nextDisabled: boolean;
    previousDisabled: boolean;
  }
): ActionRowBuilder<ButtonBuilder> => {
  const taskDetails = client.tasks.getTask<TaskTypes.EmoteNavigator>(navigatorTaskId);
  const { currentPage, totalPages } = taskDetails;

  const navigatorRow = new ActionRowBuilder<ButtonBuilder>();

  let nextDisabled = false;
  let previousDisabled = false;

  if (options) {
    nextDisabled = options.nextDisabled;
    previousDisabled = options.previousDisabled;
  }

  navigatorRow.addComponents(
    new ButtonBuilder()
      .setLabel(`Page ${currentPage}/${totalPages}`)
      .setDisabled(true)
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(navigatorTaskId)
  );

  navigatorRow.addComponents(
    new ButtonBuilder()
      .setCustomId("asdf")
      .setLabel("Previous")
      .setEmoji({
        name: "⬅️",
      })
      .setStyle(ButtonStyle.Primary)
      .setCustomId(`${navigatorTaskId}:previous`)
      .setDisabled(previousDisabled)
  );

  navigatorRow.addComponents(
    new ButtonBuilder()
      .setLabel("Next")
      .setEmoji({
        name: "➡️",
      })
      .setStyle(ButtonStyle.Primary)
      .setCustomId(`${navigatorTaskId}:next`)
      .setDisabled(nextDisabled)
  );

  navigatorRow.addComponents(
    new ButtonBuilder()
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger)
      .setCustomId(`cancelAction`)
  );

  return navigatorRow;
};

export default getNavigatorRow;
