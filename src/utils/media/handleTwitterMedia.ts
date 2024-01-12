import { MediaOutput, PlatformResult } from "../../commands/media";
import isValidURL from "../isValidURL";
import { FeedbackManager } from "../managers/FeedbackManager";

// interface OutputTwitterFn extends Output {
//   error?: String;
// }

// type TwitterFn = (
//   url: string | MediaOptionsWithUrl,
//   options?: MediaOptions
// ) => Promise<OutputTwitterFn>;

// const getTwitterMedia: TwitterFn = require("get-twitter-media");

//@ts-ignore
import { ndown } from "nayan-media-downloader";

export const handleTwitterMedia = async (
  _url: string,
  feedback: FeedbackManager
): Promise<PlatformResult> => {
  try {
    const urlVideo = _url
      .replace("x.com", "twitter.com")
      .replace("fxtwitter.com", "twitter.com");

    return {
      description: "Twitter temporarily disabled",
      media: [],
    };

    // if ("error" in twitterData) {
    //   console.log(twitterData);
    //   return { description: "", media: [] };
    // }

    // const parsedMedia: MediaOutput[] = await Promise.all(
    //   media.map(async (item): Promise<MediaOutput> => {
    //     const request = await fetch(item.url, { method: "HEAD" });
    //     const headers = request.headers;

    //     const contentType = headers.get("content-type");
    //     const contentSize = headers.get("content-length");

    //     const isVideo = contentType?.includes("video");
    //     return {
    //       source: item.url,
    //       type: isVideo ? "mp4" : "jpg",
    //       size: Number(contentSize),
    //     };
    //   })
    // );

    // const description =
    //   text
    //     ?.split(" ")
    //     .slice(0, -1)
    //     .filter((block) => !isValidURL(block))
    //     .join(" ") || "-";

    return {
      description: "",
      media: [],
    };
  } catch (error) {
    throw error;
  }
};
