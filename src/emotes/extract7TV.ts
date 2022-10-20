import isValidURL from "../utils/isValidURL";
import sharp from "sharp";

import { EmoteResponseAPI } from "../api/apiResponseType";
import {
  BaseInteraction,
  ButtonBuilder,
  ButtonInteraction,
  CommandInteraction,
} from "discord.js";

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
  interaction: CommandInteraction | ButtonInteraction
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
