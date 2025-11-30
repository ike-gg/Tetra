import {
  ActionRowBuilder,
  BaseMessageOptions,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";

import { Messages } from "@/constants/messages";
import CancelInteractionGenericButton from "@/interactions/buttons/generic/cancel-interaction";
import PPCenterCropContinuity from "@/interactions/buttons/global/pp-center-crop";
import PPRenameContinuity from "@/interactions/buttons/global/pp-remame";
import PPStretchToFitContinuity from "@/interactions/buttons/global/pp-stretch-to-fit";
import SubmitEmoteContinuity from "@/interactions/buttons/global/submit-emote";
import PPSplitContinuity from "@/interactions/select-menu/global/pp-split";
import { ProcessingEmoteService } from "@/services/processing-emote.service";
import { guildParsePremium } from "@/utils/discord/guildParsePremium";
import { TetraEmbed } from "@/utils/embedMessages/TetraEmbed";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";
import multilineText from "@/utils/multilineText";

interface EmoteReviewComponentOptions {
  processingEmoteKey: string;
  feedback: FeedbackManager;
  aspectRatio: number;
  isMultiUpload: boolean;
  uploadCount: number;
}

export const EmoteReviewComponent = async ({
  processingEmoteKey,
  feedback,
  aspectRatio,
  isMultiUpload,
  uploadCount,
}: EmoteReviewComponentOptions): Promise<BaseMessageOptions> => {
  const { emote, customName } = await ProcessingEmoteService.get(processingEmoteKey);

  const emoteName = customName ?? emote.name;
  const guild = feedback.interaction.guild;

  // Embeds

  const embeds: EmbedBuilder[] = [];

  // Warning about slots

  const { emotes: guildEmotes } = (guild && (await guildParsePremium(guild))) ?? {};

  if (guildEmotes && !isMultiUpload) {
    const freeEmoteTypeSlots = emote.animated
      ? guildEmotes.animated.free
      : guildEmotes.static.free;

    const emoteSlotsWarningEmbedContent = Messages.REMAINING_EMOTE_SLOTS_WARNING({
      remainingSlots: freeEmoteTypeSlots,
      emoteType: emote.animated ? "animated" : "static",
    });

    freeEmoteTypeSlots <= 5 &&
      embeds.push(
        freeEmoteTypeSlots === 0
          ? TetraEmbed.error(emoteSlotsWarningEmbedContent)
          : TetraEmbed.warning(emoteSlotsWarningEmbedContent)
      );
  }

  if (guildEmotes && isMultiUpload) {
    const freeEmoteTypeSlots = emote.animated
      ? guildEmotes.animated.free
      : guildEmotes.static.free;

    const emoteSlotsWarningEmbedContent = Messages.NOT_ENOUGH_EMOTE_SLOTS_SLICES({
      remainingSlots: freeEmoteTypeSlots,
      uploadCount,
      emoteType: emote.animated ? "animated" : "static",
    });

    freeEmoteTypeSlots < uploadCount &&
      embeds.push(TetraEmbed.error(emoteSlotsWarningEmbedContent));
  }

  const mainEmbed = TetraEmbed.attention({
    title: "Review emote",
    description: multilineText(
      isMultiUpload
        ? "Emote will be uploaded in parts as shown below."
        : `Rescale or rename your emote now.`,
      "",
      (aspectRatio >= 1.5 || aspectRatio <= 0.5) &&
        "> It seems like your emote is a bit too wide, consider using scaling options to get best results."
    ),
    image: {
      url: "attachment://preview.gif",
    },
  });

  embeds.push(mainEmbed);

  // Post process row

  const postProcessRow = new ActionRowBuilder<ButtonBuilder>();

  const { buttonId: ppRenameButtonId } = await PPRenameContinuity.create({
    processingEmoteKey,
  });

  postProcessRow.addComponents(
    new ButtonBuilder()
      .setCustomId(ppRenameButtonId)
      .setEmoji({
        name: "✏️",
      })
      .setLabel("Rename emote")
      .setStyle(ButtonStyle.Secondary)
  );

  const { buttonId: ppStretchToFitButtonId } = await PPStretchToFitContinuity.create({
    processingEmoteKey,
  });

  postProcessRow.addComponents(
    new ButtonBuilder()
      .setCustomId(ppStretchToFitButtonId)
      .setEmoji({
        name: "🖼️",
      })
      .setLabel("Stretch to fit")
      .setStyle(ButtonStyle.Secondary)
  );

  const { buttonId: ppCenterCropButtonId } = await PPCenterCropContinuity.create({
    processingEmoteKey,
  });

  postProcessRow.addComponents(
    new ButtonBuilder()
      .setCustomId(ppCenterCropButtonId)
      .setEmoji({
        name: "🔍",
      })
      .setLabel("Center and crop to fit")
      .setStyle(ButtonStyle.Secondary)
  );

  if (emote.animated) {
    // TODO
    // Advanced in-app optimization row
    // button that will open a modal with more options to optimize emote with different strategies, for advacned users
  }

  // Split row

  const splitRow = new ActionRowBuilder<StringSelectMenuBuilder>();

  const { buttonId: ppSplitSelectMenuId } = await PPSplitContinuity.create({
    processingEmoteKey,
  });

  const selectMenuSplit = new StringSelectMenuBuilder()
    .setCustomId(ppSplitSelectMenuId)
    .setPlaceholder("Split emote into...");

  [2, 3, 4, 5, 6].forEach((splitCount) => {
    selectMenuSplit.addOptions({
      label: `Split into ${splitCount} parts`,
      value: splitCount.toString(),
    });
  });

  selectMenuSplit.options.length > 0 && splitRow.addComponents(selectMenuSplit);

  // Manual adjustment row

  // Submit row

  const submitRow = new ActionRowBuilder<ButtonBuilder>();

  const { buttonId } = await SubmitEmoteContinuity.create({ processingEmoteKey });

  submitRow.addComponents(
    new ButtonBuilder()
      .setCustomId(buttonId)
      .setEmoji({
        name: "✅",
      })
      .setLabel(`Add emote as "${emoteName}"`)
      .setStyle(ButtonStyle.Success)
  );

  submitRow.addComponents(CancelInteractionGenericButton.metadata.getButton());

  return {
    embeds,
    components: [postProcessRow, splitRow, submitRow],
  };
};
