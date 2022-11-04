import sharp from "sharp";
import sizeOf from "buffer-image-size";

import { maxEmoteSize } from "../../config.json";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

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

  //makes square

  // processedBuffer = await sharp(image, sharpOptions)
  //   .resize({
  //     width: dimensions[1],
  //     height: dimensions[1],
  //     fit: "fill",
  //   })
  //   .toBuffer();

  if (animated) {
    processedBuffer = await sharp(processedBuffer, sharpOptions)
      .gif()
      .toBuffer();
  }

  if (processedBuffer.byteLength > maxEmoteSize) {
    await feedback?.warning(
      `We've got you but requesting emote is too big for discord.\n We're trying now to optimise it...`
    );

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
