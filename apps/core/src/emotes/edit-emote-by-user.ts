import sharp from "sharp";

import { EmoteReviewComponent } from "@/components/emote-review.component";
import { EmbeddedError } from "@/constants/errors";
import { ProcessingEmoteService } from "@/services/processing-emote.service";
import type { FeedbackManager } from "@/utils/managers/feedback-manager";

interface EditEmoteByUserOptions {
  processingEmoteKey: string;
  feedback: FeedbackManager;
}

export const editEmoteByUser = async ({
  processingEmoteKey,
  feedback,
}: EditEmoteByUserOptions) => {
  const emoteTask = await ProcessingEmoteService.get(processingEmoteKey);
  const emote = await ProcessingEmoteService.getEmote(processingEmoteKey);

  const isMultiUpload = !!emoteTask.slices;

  const emoteRawBuffer = isMultiUpload
    ? await ProcessingEmoteService.getSlicesPreviewBuffer(processingEmoteKey)
    : await ProcessingEmoteService.getBuffer(processingEmoteKey);

  if (!emoteRawBuffer) {
    throw new EmbeddedError(
      "something broke on my side while making the preview. try again, and if it keeps happening, report it with code `EEBU`"
    );
  }

  const emoteSharp = await sharp(emoteRawBuffer, {
    animated: emote.animated,
  });

  const { width, height, format, pages } = await emoteSharp.metadata();

  let aspectRatio: number = 1;

  const safeWidth = width || 1;
  const safeHeight = height || 1;
  const safePages = pages || 1;

  aspectRatio = safeWidth / (format === "gif" ? safeHeight / safePages : safeHeight);

  const emoteBufferPreview = await emoteSharp
    .gif()
    .resize({
      width: isMultiUpload ? undefined : 64,
      height: 64,
      fit: "contain",
      background: {
        alpha: 0.05,
        r: 0,
        g: 0,
        b: 0,
      },
    })
    .toBuffer();

  await feedback.updateFiles([
    {
      attachment: emoteBufferPreview,
      name: "preview.gif",
    },
  ]);

  const content = await EmoteReviewComponent({
    processingEmoteKey,
    feedback,
    aspectRatio,
    isMultiUpload,
    uploadCount: isMultiUpload ? emoteTask.slices!.parts.length : 1,
  });

  await feedback.sendMessage(content);
};
