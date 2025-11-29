import { EmoteOptimizationComponent } from "@/components/emote-optimization.component";
import { MAX_EMOTE_SIZE } from "@/constants";
import { ProcessingEmoteService } from "@/services/processing-emote.service";
import { Emote } from "@/types";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

import { editEmoteByUser } from "./edit-emote-by-user";

interface PrepareEmoteOptions {
  emote: Emote;
  feedback: FeedbackManager;
}

export const prepareEmote = async ({ emote, feedback }: PrepareEmoteOptions) => {
  const processingEmoteKey = await ProcessingEmoteService.store(emote);

  const emoteBuffer = await ProcessingEmoteService.getBuffer(processingEmoteKey);

  if (emoteBuffer.byteLength > MAX_EMOTE_SIZE) {
    const content = await EmoteOptimizationComponent({ processingEmoteKey });
    await feedback.sendMessage(content);
    return;
  }

  await editEmoteByUser({ processingEmoteKey, feedback });
};
