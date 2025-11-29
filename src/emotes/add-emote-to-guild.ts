import { EmbeddedError } from "@/constants/errors";
import { ProcessingEmoteService } from "@/services/processing-emote.service";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

import { Messages } from "../constants/messages";
import { guildParsePremium } from "../utils/discord/guildParsePremium";
import { editEmoteByUser } from "./edit-emote-by-user";

interface AddEmoteToGuildOptions {
  processingEmoteKey: string;
  feedback: FeedbackManager;
}

export const addEmoteToGuild = async ({
  processingEmoteKey,
  feedback,
}: AddEmoteToGuildOptions) => {
  const entity = await ProcessingEmoteService.get(processingEmoteKey);

  const guild = feedback.interaction.guild;

  if (!guild) {
    throw new EmbeddedError({
      title: "Guild not found",
      description: "It should never have happened, but it did. 🤨",
    });
  }

  const { emotes: guildEmotes } = guildParsePremium(guild);

  const emoteSlots = entity.emote.animated
    ? guildEmotes.animated.free
    : guildEmotes.static.free;

  if (emoteSlots === 0) {
    await editEmoteByUser({ processingEmoteKey, feedback });
    return;
  }

  const emoteBuffer = await ProcessingEmoteService.getBuffer(processingEmoteKey);

  try {
    await feedback.removeComponents();
    const uploadedEmote = await guild.emojis.create({
      attachment: emoteBuffer,
      name: entity.customName ?? entity.emote.name,
    });
    await feedback.success(Messages.ADDED_EMOTE(uploadedEmote));
  } catch (error) {
    await feedback.handleError(error);
  }
};
