import { EmoteResponseAPI } from "./apiResponseType";

const getURL = (hostURL: string): string => {
  return new URL(`2x.webp`, `https:${hostURL}/`).href;
};

const getRawEmote = async (hostURL: string) => {
  return await fetch(getURL(hostURL))
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
