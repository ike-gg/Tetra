import fetch from "node-fetch";

const getURL = (hostURL: string, isAnimated: boolean): string => {
  let extension = isAnimated ? "gif" : "webp";
  return new URL(`2x.${extension}`, `https:${hostURL}/`).href;
};

const getRawEmote = async (hostURL: string, isAnimated: boolean) => {
  try {
    const rawEmote = await fetch(getURL(hostURL, isAnimated));
    const bufferEmote = await rawEmote.arrayBuffer();
    return bufferEmote;
  } catch (error) {
    throw new Error("File not found");
  }
};

export default getRawEmote;
