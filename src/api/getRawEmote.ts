import { isatty } from "node:tty";
import { EmoteResponseAPI } from "./apiResponseType";

const getURL = (hostURL: string, isAnimated: boolean): string => {
  let extension = isAnimated ? "gif" : "webp";
  return new URL(`2x.${extension}`, `https:${hostURL}/`).href;
};

const getRawEmote = async (hostURL: string, isAnimated: boolean) => {
  return await fetch(getURL(hostURL, isAnimated))
    .then((data) => {
      return data.arrayBuffer();
    })
    .then((image) => {
      return image;
    })
    .catch((error) => {
      console.error(error);
      throw new Error("File not found");
    });
};

export default getRawEmote;
