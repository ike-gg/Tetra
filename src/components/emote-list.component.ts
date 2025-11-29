import {
  ActionRowBuilder,
  APIEmbed,
  BaseMessageOptions,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import CancelInteractionGenericButton from "@/interactions/buttons/generic/cancel-interaction";
import NavigationEmoteListContinuity from "@/interactions/buttons/global/navigation-emote-list";
import SelectEmoteContinuity from "@/interactions/buttons/global/select-emote";
import { EmoteStorageService } from "@/services/emote-storage.service";

import { EmotePreviewEmbed } from "./emote-preview.component";

interface EmoteListComponentOptions {
  storageKey: string;
  currentPage: number;
}

const emojiNumbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣"];

export const EmoteListComponent = async (
  options: EmoteListComponentOptions
): Promise<BaseMessageOptions> => {
  const { storageKey, currentPage } = options;

  const { page, pageCount } = await EmoteStorageService.getPage(storageKey, currentPage);

  // Emotes

  const selectEmoteActionRow = new ActionRowBuilder<ButtonBuilder>();
  const embeds: APIEmbed[] = [];

  const emotesChoices = await Promise.all(
    page.map(async (emote, index) => {
      const emoji = emojiNumbers[index];

      const { buttonId } = await SelectEmoteContinuity.create({ emote });

      const button = new ButtonBuilder()
        .setCustomId(buttonId)
        .setEmoji(emoji)
        .setLabel("Select")
        .setStyle(ButtonStyle.Secondary);

      return {
        button,
        embed: EmotePreviewEmbed(emote, { prefixName: emoji }).data,
      };
    })
  );

  emotesChoices.forEach(({ button, embed }) => {
    selectEmoteActionRow.addComponents(button);
    embeds.push(embed);
  });

  // Navigation

  const navigationActionRow = new ActionRowBuilder<ButtonBuilder>();

  navigationActionRow.addComponents(
    new ButtonBuilder()
      .setLabel(`Page ${currentPage}/${pageCount}`)
      .setDisabled(true)
      .setStyle(ButtonStyle.Secondary)
      .setCustomId("static-navigator")
  );

  const previousPageButton = new ButtonBuilder()
    .setLabel("Previous")
    .setEmoji({ name: "⬅️" })
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true)
    .setCustomId("previous-page-static");

  const nextPageButton = new ButtonBuilder()
    .setLabel("Next")
    .setEmoji({ name: "➡️" })
    .setStyle(ButtonStyle.Primary)
    .setDisabled(true)
    .setCustomId("next-page-static");

  const previousPage = currentPage - 1;
  const nextPage = currentPage + 1;

  if (previousPage > 0) {
    const { buttonId } = await NavigationEmoteListContinuity.create({
      storageKey,
      setPage: previousPage,
    });

    previousPageButton.setCustomId(buttonId);
    previousPageButton.setDisabled(false);
  }

  if (nextPage <= pageCount) {
    const { buttonId } = await NavigationEmoteListContinuity.create({
      storageKey,
      setPage: nextPage,
    });

    nextPageButton.setCustomId(buttonId);
    nextPageButton.setDisabled(false);
  }

  navigationActionRow.addComponents(previousPageButton, nextPageButton);

  navigationActionRow.addComponents(CancelInteractionGenericButton.metadata.getButton());

  return {
    components: [selectEmoteActionRow, navigationActionRow],
    embeds,
  };
};
