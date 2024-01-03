import path from "path";
import sharp from "sharp";

export const watermarkImage = async (image: Buffer): Promise<Buffer> => {
  const watermarkPath = path.resolve(__dirname, "./watermark.png");

  return await sharp(image)
    .composite([{ input: watermarkPath, gravity: "center" }])
    .toBuffer();
};
