import fetch from "node-fetch";

const getBufferFromUrl = async (sourceUrl: string) => {
  try {
    const rawEmote = await fetch(sourceUrl);
    const bufferEmote = await rawEmote.buffer();
    return bufferEmote;
  } catch (error) {
    throw new Error("File not found");
  }
};

export default getBufferFromUrl;
