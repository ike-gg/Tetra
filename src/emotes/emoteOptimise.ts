import sharp from "sharp";
import sizeOf from "buffer-image-size";

import { ButtonInteraction, CommandInteraction } from "discord.js";
import { maxEmoteSize } from "../../config.json";
import warningEmbed from "../utils/embedMessages/warningEmbed";
import { FeedbackManager } from "../utils/embedMessages/FeedbackManager";

const emoteOptimise = async (
  image: Buffer,
  options: {
    animated: boolean;
    feedback?: FeedbackManager;
  }
): Promise<Buffer> => {
  const { animated, feedback } = options;
  let processedBuffer: Buffer = image;
  const imageData = sizeOf(processedBuffer);
  let dimensions: [number, number] = [imageData.width, imageData.height];

  const sharpOptions = { animated: options.animated };
  if (animated) {
    processedBuffer = await sharp(image, sharpOptions).gif().toBuffer();
  }

  if (processedBuffer.byteLength > maxEmoteSize) {
    feedback
      ? feedback.warning(
          `We've got you but requesting emote is too big for discord.\n We're trying now to optimise it...`
        )
      : null;

    while (processedBuffer.byteLength > maxEmoteSize) {
      console.log(`${processedBuffer.byteLength} / ${maxEmoteSize}`);

      dimensions = dimensions.map((dimension) =>
        Math.floor((dimension *= 0.85))
      ) as [number, number];

      const [x, y] = dimensions;

      animated
        ? (processedBuffer = await sharp(processedBuffer, sharpOptions)
            .gif()
            .resize(x, y)
            .toBuffer())
        : (processedBuffer = await sharp(processedBuffer, sharpOptions)
            .jpeg()
            .resize(x, y)
            .toBuffer());
    }
  }
  return processedBuffer;
};

export default emoteOptimise;
