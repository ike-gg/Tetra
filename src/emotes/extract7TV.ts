import isValidURL from "../utils/isValidURL";
import sharp from "sharp";

import { EmoteResponseAPI, EmoteFileAPI } from "../api/apiResponseType";
import { Base64String, GuildPreview } from "discord.js";
import getEmoteInfo from "../api/getEmoteInfo";
import getRawEmote from "../api/getRawEmote";

interface ExtractedEmote {
  name: string;
  author: string;
  image: Buffer;
  preview: string;
}

const extractEmote = async (emoteIdentificator: string) => {
  return new Promise<ExtractedEmote>(async (resolve, reject) => {
    let internalId: string | undefined = emoteIdentificator;

    if (isValidURL(internalId)) {
      let fullURL = new URL(emoteIdentificator);
      let pathnamesArray = fullURL.pathname.split("/");
      internalId = pathnamesArray.find((path) => path.length === 24);
    }

    if (internalId === undefined || internalId.length !== 24) {
      reject("Invalid emote reference or URL");
      return;
    }

    try {
      const emoteInfo = (await getEmoteInfo(internalId!)) as EmoteResponseAPI;
      let emotePreview = `https:${emoteInfo.host.url}/2x.webp`;

      const rawEmote = await getRawEmote(emoteInfo.host.url);
      let emoteBuffer = Buffer.from(rawEmote!);

      if (emoteInfo.animated) {
        emotePreview = `https:${emoteInfo.host.url}/2x.gif`;
        await sharp(emoteBuffer, { animated: true })
          .gif({ reoptimise: true, reoptimize: true })
          // .resize(20, 20)
          .toBuffer()
          .then((data) => {
            emoteBuffer = data;
          })
          .catch((error) => {
            reject(error);
          });
      }

      console.log(emoteBuffer.byteLength);

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
