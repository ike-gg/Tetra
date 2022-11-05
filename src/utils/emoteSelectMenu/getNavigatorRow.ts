import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";
import { DiscordBot } from "../../types";

const getNavigatorRow = (
  navigatorTaskId: string,
  client: DiscordBot,
  options?: {
    nextDisabled: boolean;
    previousDisabled: boolean;
  }
): ActionRowBuilder<ButtonBuilder> => {
  const taskDetails = client.tasks.getTask(navigatorTaskId);
  const { currentPage, pagesLimit } = taskDetails!.options!;

  const navigatorRow = new ActionRowBuilder<ButtonBuilder>();

  let nextDisabled = false;
  let previousDisabled = false;

  if (options) {
    nextDisabled = options.nextDisabled;
    previousDisabled = options.previousDisabled;
  }

  navigatorRow.addComponents(
    new ButtonBuilder()
      .setLabel(`Page ${currentPage}/${pagesLimit}`)
      .setDisabled(true)
      .setStyle(ButtonStyle.Secondary)
      .setCustomId(navigatorTaskId)
  );

  navigatorRow.addComponents(
    new ButtonBuilder()
      .setCustomId("asdf")
      .setLabel("Previous")
      .setEmoji({ name: "⬅️" })
      .setStyle(ButtonStyle.Primary)
      .setCustomId(`${navigatorTaskId}:previous`)
      .setDisabled(previousDisabled)
  );

  navigatorRow.addComponents(
    new ButtonBuilder()
      .setCustomId("nextpage")
      .setLabel("Next")
      .setEmoji({ name: "➡️" })
      .setStyle(ButtonStyle.Primary)
      .setCustomId(`${navigatorTaskId}:next`)
      .setDisabled(nextDisabled)
  );

  navigatorRow.addComponents(
    new ButtonBuilder()
      .setCustomId("cancelAction")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger)
  );

  return navigatorRow;
};

export default getNavigatorRow;
