import sharp from "sharp";

import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { AutoXGifsicle } from "../utils/AutoXGifsicle";
import { maxEmoteSize } from "../constants";

const emoteOptimise = async (
  emoteBuffer: Buffer,
  options: {
    animated: boolean;
    feedback?: FeedbackManager;
    transform?: "square" | "center";
  }
) => {
  const { animated, feedback, transform } = options;
  try {
    let processedBuffer: Buffer = emoteBuffer;

    await feedback?.warning("Processing your emote ⏳");

    if (!animated) {
      const buffer = sharp(processedBuffer, { animated: false });
      const { height: _height, width: _width } = (await buffer.metadata()) as {
        width: number;
        height: number;
      };

      const side = Math.min(Math.max(_height, _width), 128);
      console.log(side);

      transform === "center" &&
        buffer.resize({ fit: "cover", width: side, height: side });
      transform === "square" &&
        buffer.resize({ fit: "fill", width: side, height: side });

      processedBuffer = await buffer.toBuffer();
    }

    if (animated) {
      const buffer = new AutoXGifsicle(processedBuffer, {
        lossy: 80,
        finalSize: maxEmoteSize,
      });

      transform === "center" && (await buffer.centerCrop());
      transform === "square" && (await buffer.stretchToFit());

      await buffer.optimize();

      console.table(buffer.actionLog);

      processedBuffer = buffer.fileBuffer;
    }

    return processedBuffer;
  } catch (error) {
    await feedback?.error(String(error));
    throw new Error(String(error));
  }
};

export default emoteOptimise;
