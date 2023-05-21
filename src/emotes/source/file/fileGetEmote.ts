import fetch from "node-fetch";

const fileGetRawEmote = async (resourceUrl: string) => {
  try {
    const response = await fetch(resourceUrl);
    const emoteBuffer = await response.arrayBuffer();
    return emoteBuffer;
  } catch (error) {
    throw new Error("File not found");
  }
};

export default fileGetRawEmote;
