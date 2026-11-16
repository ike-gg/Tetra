import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
} from "discord.js";
import { z } from "zod";

import { Messages } from "@/constants/messages";
import { db } from "@/db";
import { EmoteOrigin, editorTasks, emotes } from "@/db/schema";
import { env } from "@/env";
import {
  BaseContinuity,
  type ContinuityHandler,
} from "@/interactions/continuity/base-continuity";
import { ProcessingEmoteService } from "@/services/processing-emote.service";
import type { SupportedEmoteOrigin } from "@/types";
import { TetraEmbed } from "@/utils/embed-messages/tetra-embed";
import { FeedbackManager } from "@/utils/managers/feedback-manager";

export const OpenInEditorEmoteContinuitySchema = z.object({
  processingEmoteKey: z.string(),
});

type OpenInEditorEmoteContinuityDataType = z.infer<
  typeof OpenInEditorEmoteContinuitySchema
>;

const toDbOrigin = (origin: SupportedEmoteOrigin): EmoteOrigin => {
  switch (origin) {
    case "7tv":
      return EmoteOrigin.SEVENTV;
    case "bttv":
      return EmoteOrigin.BTTV;
    case "ffz":
      return EmoteOrigin.FFZ;
    case "twitch":
      return EmoteOrigin.TWITCH;
    case "discord":
      return EmoteOrigin.DISCORD;
    default:
      return EmoteOrigin.CUSTOM;
  }
};

export class OpenInEditorEmoteButtonInteraction extends BaseContinuity<OpenInEditorEmoteContinuityDataType> {
  constructor(
    handler: ContinuityHandler<OpenInEditorEmoteContinuityDataType, ButtonInteraction>
  ) {
    super(OpenInEditorEmoteContinuitySchema, { name: "open-in-editor-emote" });
    this.handler = handler;
  }
}

const OpenInEditorEmoteContinuity = new OpenInEditorEmoteButtonInteraction(
  async ({ interaction, data }) => {
    const feedback = new FeedbackManager(interaction);

    try {
      if (!interaction.guild) {
        await feedback.error(Messages.ERROR_GUILD_ONLY);
        return;
      }

      await feedback.removeComponents();
      await feedback.working();

      const { emote, customName } = await ProcessingEmoteService.get(
        data.processingEmoteKey
      );

      // The editor downloads the source file in the browser, local edits are not kept
      const [insertedEmote] = await db
        .insert(emotes)
        .values({
          externalId: emote.id,
          isAnimated: emote.animated,
          name: customName ?? emote.name,
          origin: toDbOrigin(emote.origin),
          previewUrl: emote.file.preview,
          url: emote.file.url,
        })
        .returning();

      const [task] = await db
        .insert(editorTasks)
        .values({
          emoteId: insertedEmote.id,
          guildId: interaction.guild.id,
          userId: interaction.user.id,
          channelId: interaction.channelId,
          messageId: interaction.message.id,
        })
        .returning();

      const linkRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setEmoji("✏️")
          .setLabel("open in editor")
          .setURL(`${env.FRONTEND_URL}/panel/tasks/${task.id}`)
      );

      await feedback.sendMessage({
        embeds: [TetraEmbed.panel(Messages.TASK_IN_EDITOR)],
        components: [linkRow],
      });
    } catch (error) {
      await feedback.handleError(error);
    }
  }
);

export default OpenInEditorEmoteContinuity;
