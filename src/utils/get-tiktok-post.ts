import { Downloader } from "tiktokapi-src";

interface TikTokVideo {
  video: string;
  author?: string;
}

interface TikTokSlideshow {
  images: string[];
  music?: string;
  author?: string;
}

type TikTokPost = TikTokVideo | TikTokSlideshow;

export const getTikTokPost = async (link: string): Promise<TikTokPost> => {
  try {
    // const data = await Downloader(link, { version: "v2" });

    // if (data.status === "error" || !data.result) throw new Error(data.message);

    // const { author, images, video } = data.result;

    // if (video) return { video, author: author.nickname };
    // if (images)
    //   return { images, music: data.result.music, author: author.nickname };

    // throw new Error("Invalid TikTok post, no video or images found");
    const response = await fetch("https://api.cobalt.tools/api/json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url: link,
      }),
    });

    const data = (await response.json()) as {
      picker: {
        url: string;
      }[];
      audio: string;
    };

    return {
      images: data.picker.map((image) => image.url),
      music: data.audio,
    };
  } catch (error) {
    console.log("downloading failed->", error);
    throw new Error("Downloading tiktok failed");
  }
};
