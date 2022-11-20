import sharp from "sharp";
import emote7tv from "./src/emotes/emote7tv";

(async () => {
  try {
    const emote = await emote7tv("634493ce05c2b2cd864d5f0d");
    const buffer = emote.data;
    const types = ["cover", "contain", "fill", "inside", "outside"];
    for (let type of types) {
      //@ts-ignore
      await sharp(buffer)
        .resize({ width: 100, height: 100, fit: type })
        .png()
        .toFile(`${type}.png`);
    }
  } catch (error) {
    console.log(error);
  }
})();
