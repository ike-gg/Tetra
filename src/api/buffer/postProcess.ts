import { Request, Response } from "express";
import prettyBytes from "pretty-bytes";
import sharp from "sharp";
import gifsicle from "../../utils/gifsicle";

export default async (req: Request, res: Response) => {
  if (!req.body.buffer) {
    res.sendStatus(400);
    return;
  }

  try {
    const buffer = Buffer.from(req.body.buffer);
    const options = req.body.options;

    console.log(options);

    let postProceed: Buffer = buffer;

    const { width, height, pages, delay } = await sharp(postProceed, {
      animated: true,
    }).metadata();
    console.log(width, height, pages, delay);

    console.log("cutting...");

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

    console.log("main schema...");

    postProceed = await gifsicle({
      ...options,
      optimizationLevel: 3,
    })(postProceed);

    console.log("fitting...");

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

    console.log(
      "after on backend:",
      postProceed.byteLength,
      prettyBytes(postProceed.byteLength)
    );

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
