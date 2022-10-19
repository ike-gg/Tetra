import isValidURL from "../utils/isValidURL";
import sharp from "sharp";

import { EmoteResponseAPI } from "../api/apiResponseType";
import { CommandInteraction } from "discord.js";

import getEmoteInfo from "../api/getEmoteInfo";
import getRawEmote from "../api/getRawEmote";
import emoteOptimise from "./emoteOptimise";

interface ExtractedEmote {
  name: string;
  author: string;
  image: Buffer;
  preview: string;
}

const extractEmote = async (
  emoteReference: string,
  interaction: CommandInteraction
) => {
  return new Promise<ExtractedEmote>(async (resolve, reject) => {
    let internalId: string | undefined = emoteReference;

    if (isValidURL(internalId)) {
      let fullURL = new URL(emoteReference);
      let pathnamesArray = fullURL.pathname.split("/");
      internalId = pathnamesArray.find((path) => path.length === 24);
    }

    if (internalId === undefined || internalId.length !== 24) {
      reject("Invalid emote reference or URL");
      return;
    }

    try {
      const emoteInfo = (await getEmoteInfo(internalId!)) as EmoteResponseAPI;
      let emotePreview = `https:${emoteInfo.host.url}/2x`;
      emoteInfo.animated ? (emotePreview += ".gif") : (emotePreview += ".webp");

      const rawEmote = await getRawEmote(emoteInfo.host.url);
      let rawEmoteBuffer = Buffer.from(rawEmote!);

      const emoteBuffer = await emoteOptimise(rawEmoteBuffer, {
        animated: emoteInfo.animated,
        interaction: interaction,
      });

      console.log(emoteBuffer);

      // if (emoteInfo.animated) {
      //   await sharp(emoteBuffer, { animated: true })
      //     .gif({ reoptimise: true, reoptimize: true })
      //     // .resize(20, 20)
      //     .toBuffer()
      //     .then((data) => {
      //       emoteBuffer = data;
      //     })
      //     .catch((error) => {
      //       reject(error);
      //     });
      // }

      // if (emoteBuffer.byteLength > maxEmoteSize) {
      //   reject(
      //     `file size exceeded, fetching optimise function ${emoteBuffer.byteLength} / max. ${maxEmoteSize}`
      //   );
      // }

      console.log("uwolnienie");

      resolve({
        author: emoteInfo.owner.display_name,
        name: emoteInfo.name,
        image: emoteBuffer,
        preview: emotePreview,
      });
    } catch (error) {
      console.error(error);
      reject("Emote not found.");
    }
  });
};

export default extractEmote;
