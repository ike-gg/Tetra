import {
  ActionRowBuilder,
  type BaseMessageOptions,
  ButtonBuilder,
  ButtonStyle,
  type EmbedBuilder,
} from "discord.js";
import prettyBytes from "pretty-bytes";

import { MAX_EMOTE_SIZE } from "@/constants";
import CancelInteractionGenericButton from "@/interactions/buttons/generic/cancel-interaction";
import AutoOptimizeEmoteContinuity from "@/interactions/buttons/global/auto-optimize-emote";
import OpenInEditorEmoteContinuity from "@/interactions/buttons/global/open-in-editor-emote";
import { ProcessingEmoteService } from "@/services/processing-emote.service";
import { TetraEmbed } from "@/utils/embed-messages/tetra-embed";
import multilineText from "@/utils/multiline-text";

interface EmoteOptimizationComponentOptions {
  processingEmoteKey: string;
}

export const EmoteOptimizationComponent = async ({
  processingEmoteKey,
}: EmoteOptimizationComponentOptions): Promise<BaseMessageOptions> => {
  const emoteBuffer = await ProcessingEmoteService.getBuffer(processingEmoteKey);
  const emoteBufferSize = emoteBuffer.byteLength;

  // Embeds

  const embeds: EmbedBuilder[] = [];

  const maxSize = prettyBytes(MAX_EMOTE_SIZE);
  const emoteSize = prettyBytes(emoteBufferSize);
  const diffSizeRaw = emoteBufferSize - MAX_EMOTE_SIZE;
  const diffSize = prettyBytes(diffSizeRaw);

  const isWayTooBig = diffSizeRaw > 1024 * 1024;

  const mainEmbed = TetraEmbed.attention({
    description: multilineText(
      "Emote exceeded maximum size.",
      `**${emoteSize}** / ${maxSize} *(exceeds by ${diffSize})*`,
      isWayTooBig ? " " : false,
      isWayTooBig
        ? "*The emote size is significantly too large. Automatic optimization results may not be satisfactory in this case. Consider using manual adjustment instead.*"
        : false,
      " ",
      "Choose the optimization method."
    ),
  });

  embeds.push(mainEmbed);

  // Decision row

  const decisionRow = new ActionRowBuilder<ButtonBuilder>();

  const { buttonId: autoOptimizeButtonId } = await AutoOptimizeEmoteContinuity.create({
    processingEmoteKey,
  });

  decisionRow.addComponents(
    new ButtonBuilder()
      .setCustomId(autoOptimizeButtonId)
      .setEmoji({
        name: "🤖",
      })
      .setLabel("Auto optimization")
      .setStyle(isWayTooBig ? ButtonStyle.Secondary : ButtonStyle.Primary)
  );

  const { buttonId: openInEditorButtonId } = await OpenInEditorEmoteContinuity.create({
    processingEmoteKey,
  });

  decisionRow.addComponents(
    new ButtonBuilder()
      .setCustomId(openInEditorButtonId)
      .setEmoji("✏️")
      .setLabel("Open in editor")
      .setStyle(isWayTooBig ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );

  decisionRow.addComponents(CancelInteractionGenericButton.metadata.getButton());

  return {
    embeds,
    components: [decisionRow],
  };
};
