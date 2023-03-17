import fetch from "node-fetch";

const getRawEmote = async (hostURL: string) => {
  try {
    const response = await fetch(hostURL);
    const emoteBuffer = await response.arrayBuffer();
    return emoteBuffer;
  } catch (error) {
    throw new Error("File not found");
  }
};

export default getRawEmote;
