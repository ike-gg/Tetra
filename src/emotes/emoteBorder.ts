import sharp from "sharp";

const emoteBorder = async (emote: Buffer) => {
  let borderedEmote: Buffer = emote;
  let meta = await sharp(borderedEmote).metadata();

  borderedEmote = await sharp(emote)
    .extend({
      top: 5,
      bottom: 5,
      left: 5,
      right: 5,
      background: { r: 256, g: 0, b: 0, alpha: 0 },
    })

    .toBuffer();

  borderedEmote = await sharp(borderedEmote)
    .extend({
      top: 3,
      bottom: 3,
      left: 3,
      right: 3,
      background: { r: 255, g: 137, b: 18, alpha: 1 },
    })
    .gif()
    .toBuffer();

  return borderedEmote;
};

export default emoteBorder;
