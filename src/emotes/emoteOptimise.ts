import sharp from "sharp";
import sizeOf from "buffer-image-size";

import {
  BaseInteraction,
  ButtonInteraction,
  CommandInteraction,
} from "discord.js";
import { maxEmoteSize } from "../../config.json";
import warningEmbed from "../utils/embedMessage/warningEmbed";

const emoteOptimise = async (
  image: Buffer,
  options: {
    animated: boolean;
    interaction?: CommandInteraction | ButtonInteraction;
  }
): Promise<Buffer> => {
  const { animated, interaction } = options;
  let processedBuffer: Buffer = image;
  let dimensions = sizeOf(processedBuffer);

  if (animated) {
    processedBuffer = await sharp(image, { animated: true }).gif().toBuffer();
  }
  if (processedBuffer.byteLength > maxEmoteSize) {
    interaction?.editReply(
      warningEmbed(
        `We've got you but requesting emote is too big for discord.\n We're trying now to optimise it...`
      )
    );
    while (processedBuffer.byteLength > maxEmoteSize) {
      dimensions.height = Math.floor((dimensions.height *= 0.8));
      dimensions.width = Math.floor((dimensions.width *= 0.8));
      if (animated) {
        processedBuffer = await sharp(processedBuffer, { animated })
          .gif()
          .resize(dimensions.width, dimensions.height)
          .toBuffer();
      } else {
        processedBuffer = await sharp(processedBuffer)
          .jpeg()
          .resize(dimensions.width, dimensions.height)
          .toBuffer();
      }
    }
  }
  return processedBuffer;
};

export default emoteOptimise;
