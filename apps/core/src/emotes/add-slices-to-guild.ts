import type { GuildEmoji } from "discord.js";

import { EmbeddedError } from "@/constants/errors";
import { ProcessingEmoteService } from "@/services/processing-emote.service";
import type { FeedbackManager } from "@/utils/managers/feedback-manager";

import { guildParsePremium } from "../utils/discord/guild-parse-premium";
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
    throw new EmbeddedError(
      "something broke on my side, i lost track of this server. try again, and if it keeps happening, send an error report"
    );
  }

  const { emotes: guildEmotes } = guildParsePremium(guild);

  const emoteSlots = emote.animated ? guildEmotes.animated.free : guildEmotes.static.free;

  if (slices.length > emoteSlots) {
    await editEmoteByUser({ processingEmoteKey, feedback });
    return;
  }

  try {
    await feedback.removeComponents();
    await feedback.warning(`uploading ${slices.length} emotes, this can take a minute`);

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
      `added ${uploadedEmotes.length} emotes: ${uploadedEmotes.join(", ")}`
    );
  } catch (error) {
    await feedback.handleError(error);
  }
};
