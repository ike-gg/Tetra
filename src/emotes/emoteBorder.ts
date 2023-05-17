import sharp from "sharp";

const emoteBorder = async (emote: Buffer, isAnimated: boolean) => {
  let borderedEmote: Buffer = emote;

  const sharpOptions = { animated: isAnimated };

  borderedEmote = await sharp(borderedEmote, sharpOptions)
    .resize({
      width: 64,
      height: 64,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .extend({
      top: 5,
      bottom: 5,
      left: 5,
      right: 5,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .gif()
    .toBuffer();

  borderedEmote = await sharp(borderedEmote, sharpOptions)
    .extend({
      top: 3,
      bottom: 3,
      left: 3,
      right: 3,
      background: { r: 128, g: 128, b: 128, alpha: 1 },
    })
    .gif()
    .toBuffer();

  return borderedEmote;
};

export default emoteBorder;
