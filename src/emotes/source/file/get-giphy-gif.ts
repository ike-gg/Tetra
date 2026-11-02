import { Emote } from "../../../types";
import isValidURL from "../../../utils/isValidURL";

const getGiphyGif = async (giphyUrl: string): Promise<Emote> => {
  if (!isValidURL(giphyUrl)) throw new Error("Provided URL is not valid.");

  const { hostname, pathname } = new URL(giphyUrl);

  let gifId: string | null = null;

  if (hostname === "media.giphy.com") {
    gifId = pathname.split("/").find((path) => path.length === 18) || null;
  }

  if (hostname === "giphy.com") {
    gifId = pathname.split("-").at(-1) || null;
  }

  if (!gifId) throw new Error("No gif id found.");

  return {
    animated: true,
    author: "Giphy GIF",
    file: {
      preview: `https://i.giphy.com/media/${gifId}/100.gif`,
      url: `https://i.giphy.com/media/${gifId}/100.gif`,
    },
    id: gifId,
    name: "Emote name",
    origin: "giphy",
  };
};

export default getGiphyGif;
