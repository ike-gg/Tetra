import fetch from "node-fetch";

const getRawEmote = async (hostURL: string) => {
  return await fetch(hostURL)
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
