import isValidURL from "../utils/isValidURL";

import { EmoteResponseAPI, EmoteFileAPI } from "../api/apiResponseType";
import { Base64String } from "discord.js";

interface ExtractedEmote {
  name: string;
  image: Base64String;
}

const extractEmote = async (emoteIdentificator: string) => {
  let internalId: string | undefined = emoteIdentificator;

  if (isValidURL(internalId)) {
    let fullURL = new URL(emoteIdentificator);
    let pathnamesArray = fullURL.pathname.split("/");
    internalId = pathnamesArray.find((path) => path.length === 24);
  }

  const emoteInfo = await fetch(`https://7tv.io/v3/emotes/${internalId}`);
  const emoteInfoJSON: EmoteResponseAPI = await emoteInfo.json();

  let emotes: EmoteFileAPI[] = emoteInfoJSON.host.files.filter((file) => {
    if (file.format === "AVIF") return false;
    return true;
  });

  const emoteRaw = await fetch(`https:${emoteInfoJSON.host.url}/3x.webp`);
  const emoteArrayBuffer = await emoteRaw.arrayBuffer();
  const emoteBuffer = Buffer.from(emoteArrayBuffer);

  return {
    name: emoteInfoJSON.name,
    emoteBuffer,
    emotePreviewURL: `https:${emoteInfoJSON.host.url}/4x.webp`,
  };
};

export default extractEmote;
