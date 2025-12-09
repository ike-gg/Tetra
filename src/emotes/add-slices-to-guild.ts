import { GuildEmoji } from "discord.js";

import { EmbeddedError } from "@/constants/errors";
import { ProcessingEmoteService } from "@/services/processing-emote.service";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

import { guildParsePremium } from "../utils/discord/guildParsePremium";
import { editEmoteByUser } from "./edit-emote-by-user";

interface AddSlicesToGuildOptions {
  processingEmoteKey: string;
  feedback: FeedbackManager;
}

export const addSlicesToGuild = async ({
  processingEmoteKey,
  feedback,
}: AddSlicesToGuildOptions) => {
  const slices = await ProcessingEmoteService.getSlices(processingEmoteKey);
  const { customName } = await ProcessingEmoteService.get(processingEmoteKey);
  const emote = await ProcessingEmoteService.getEmote(processingEmoteKey);

  const guild = feedback.interaction.guild;

  if (!guild) {
    throw new EmbeddedError({
      title: "Guild not found",
      description: "It should never have happened, but it did. 🤨",
    });
  }

  const { emotes: guildEmotes } = guildParsePremium(guild);

  const emoteSlots = emote.animated ? guildEmotes.animated.free : guildEmotes.static.free;

  if (slices.length > emoteSlots) {
    await editEmoteByUser({ processingEmoteKey, feedback });
    return;
  }

  try {
    await feedback.removeComponents();
    await feedback.warning(`Uploading ${slices.length} emotes.. it could take a while`);

    const uploadedEmotes: GuildEmoji[] = [];

    const emoteName = customName ?? emote.name;

    for (const [i, emotePart] of slices.entries()) {
      const addedEmote = await guild.emojis.create({
        attachment: emotePart,
        name: `${emoteName}${i + 1}`,
      });
      uploadedEmotes.push(addedEmote);
    }

    await feedback.success(
      `Successfully uploaded all emotes. ${uploadedEmotes.join(", ")}`
    );
  } catch (error) {
    await feedback.handleError(error);
  }
};
