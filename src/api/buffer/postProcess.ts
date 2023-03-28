import { Request, Response } from "express";
import prettyBytes from "pretty-bytes";
import sharp from "sharp";
import gifsicle from "../../utils/gifsicle";

export default async (req: Request, res: Response) => {
  console.log(new Date().toISOString(), "postProcess-request received");
  const time = performance.now();
  console.log("postProcess-received request at", time, "ms");

  if (!req.body.buffer) {
    res.sendStatus(400);
    return;
  }

  try {
    const buffer = Buffer.from(req.body.buffer);
    const options = req.body.options;

    console.log(options);

    let postProceed: Buffer = buffer;

    const workingOnBufferTime = performance.now();
    console.log(
      "postProcess-working on buffer in",
      workingOnBufferTime - time,
      "ms"
    );

    if (options.cut) {
      const { cut }: { cut: [[number, number], [number, number]] } = options;
      const cutBeginning = cut[0];
      const cutEnd = cut[1];
      const cutStartString = `#${cutBeginning[0]}-${cutBeginning[1]}`;
      const cutEndString = `#${cutEnd[0]}-${cutEnd[1]}`;

      postProceed = await gifsicle({
        cut: cutEndString,
      })(postProceed);

      postProceed = await gifsicle({
        cut: cutStartString,
      })(postProceed);

      options.cut = undefined;
    }

    const cuttingTime = performance.now();
    console.log("postProcess-cutting in", cuttingTime - time, "ms");

    postProceed = await gifsicle({
      ...options,
      optimizationLevel: 3,
    })(postProceed);

    const mainProcessTime = performance.now();
    console.log("postProcess-main process in", mainProcessTime - time, "ms");

    if (options.fitting) {
      const { pageHeight: nHeight } = await sharp(postProceed, {
        animated: true,
      }).metadata();

      postProceed = await sharp(postProceed, { animated: true })
        .gif()
        .resize({
          fit: options.fitting,
          height: nHeight,
          width: nHeight,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toBuffer();

      postProceed = await gifsicle({
        optimizationLevel: 3,
      })(postProceed);
    }

    const endTime = performance.now();
    console.log("postProcess-processed image in", endTime - time, "ms");

    res.json(postProceed);
  } catch (e) {
    console.log(e);
    res.status(500).json({
      message:
        "Something went wrong while processing the image, please try again with different settings.",
    });
  }

  // const confirmPredict = await imageminGiflossy({
  //   lossy: 150,
  //   optimizationLevel: 3,
  // })(processedBuffer);
};
