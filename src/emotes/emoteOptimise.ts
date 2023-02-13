import sharp from "sharp";
import sizeOf from "buffer-image-size";
import prettyBytes from "pretty-bytes";
//@ts-ignore
import imageminGiflossy from "imagemin-giflossy";

import { FeedbackManager } from "../utils/managers/FeedbackManager";

const maxEmoteSize = 262144;

const emoteOptimise = async (
  image: Buffer,
  options: {
    animated: boolean;
    feedback?: FeedbackManager;
    transform?: "square" | "center";
  }
) => {
  try {
    const { animated, feedback } = options;
    let processedBuffer: Buffer = image;

    const imageData = sizeOf(processedBuffer);
    let dimensions: [number, number] = [imageData.width, imageData.height];

    const longerSide =
      dimensions[0] > dimensions[1] ? dimensions[0] : dimensions[1];

    const sharpOptions = { animated: options.animated };

    if (options.transform) {
      const { transform } = options;
      let option: "fill" | "cover";

      if (transform === "square") option = "fill";
      if (transform === "center") option = "cover";

      processedBuffer = await sharp(image, sharpOptions)
        .resize({
          width: longerSide,
          height: longerSide,
          fit: option!,
        })
        .gif()
        .toBuffer();
    }

    if (!options.transform) {
      processedBuffer = await sharp(image, sharpOptions)
        .resize({
          width: longerSide,
          height: longerSide,
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .gif()
        .toBuffer();
    }

    if (animated) {
      processedBuffer = await sharp(processedBuffer, sharpOptions)
        .gif()
        .toBuffer();
    }

    let predictOptimize: number | null = null;
    let iterations = 0;

    if (processedBuffer.byteLength > maxEmoteSize) {
      while (processedBuffer.byteLength > maxEmoteSize) {
        iterations++;
        const currentSize = prettyBytes(processedBuffer.byteLength);
        const maxSize = prettyBytes(maxEmoteSize);
        await feedback?.warning(
          `Now I optimize the image file of the emote so that it has the required size by discord, if the file size is too large, it can badly affect its quality.\n ${currentSize} / ${maxSize}, `
        );

        const dmns = await sharp(processedBuffer).metadata();
        const dimensionsNew = [dmns.width!, dmns.height!];

        dimensions = dimensionsNew.map((dimension) =>
          Math.floor((dimension *= 0.95))
        ) as [number, number];

        const [x, y] = dimensions;

        const resizeOptions: sharp.ResizeOptions = {
          width: x,
          height: y,
        };

        if (options.transform) {
          const { transform } = options;
          if (transform === "square") resizeOptions.fit = "fill";
          if (transform === "center") resizeOptions.fit = "cover";
        }

        if (animated) {
          if (iterations === 1) {
            const optimizedDifference = await imageminGiflossy({
              lossy: 200,
              optimizationLevel: 3,
            })(processedBuffer);
            const optimizedSize = optimizedDifference.byteLength;
            predictOptimize = processedBuffer.byteLength - optimizedSize;
            predictOptimize = optimizedSize / processedBuffer.byteLength;
          }

          if (
            predictOptimize &&
            processedBuffer.byteLength * predictOptimize < maxEmoteSize
          ) {
            const confirmPredict = await imageminGiflossy({
              lossy: 150,
              optimizationLevel: 3,
            })(processedBuffer);

            if (confirmPredict.byteLength > maxEmoteSize) {
              processedBuffer = await sharp(processedBuffer, sharpOptions)
                .gif()
                .resize(resizeOptions)
                .toBuffer();
            } else {
              processedBuffer = confirmPredict;
            }
          } else {
            predictOptimize! *= 1.012;
            processedBuffer = await sharp(processedBuffer, sharpOptions)
              .gif()
              .resize(resizeOptions)
              .toBuffer();
          }
        } else {
          processedBuffer = await sharp(processedBuffer, sharpOptions)
            .jpeg()
            .resize(resizeOptions)
            .toBuffer();
        }
      }
    }
    return processedBuffer;
  } catch (error) {
    throw new Error(String(error));
  }
};

export default emoteOptimise;
