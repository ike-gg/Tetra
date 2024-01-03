import { MediaOutput, PlatformResult } from "../../commands/media";
import isValidURL from "../isValidURL";

import type {
  MediaOptionsWithUrl,
  MediaOptions,
  Output,
} from "get-twitter-media";
import { FeedbackManager } from "../managers/FeedbackManager";

interface OutputTwitterFn extends Output {
  error?: String;
}

type TwitterFn = (
  url: string | MediaOptionsWithUrl,
  options?: MediaOptions
) => Promise<OutputTwitterFn>;

const getTwitterMedia: TwitterFn = require("get-twitter-media");

export const handleTwitterMedia = async (
  _url: string,
  feedback: FeedbackManager
): Promise<PlatformResult> => {
  try {
    const urlVideo = _url
      .replace("x.com", "twitter.com")
      .replace("fxtwitter.com", "twitter.com");

    const twitterData = await getTwitterMedia(urlVideo, {
      text: true,
    });

    const { media, text } = twitterData;

    const parsedMedia: MediaOutput[] = await Promise.all(
      media.map(async (item): Promise<MediaOutput> => {
        const request = await fetch(item.url, { method: "HEAD" });
        const headers = request.headers;

        const contentType = headers.get("content-type");
        const contentSize = headers.get("content-length");

        const isVideo = contentType?.includes("video");
        return {
          source: item.url,
          type: isVideo ? "mp4" : "jpg",
          size: Number(contentSize),
        };
      })
    );

    const description =
      text
        ?.split(" ")
        .slice(0, -1)
        .filter((block) => !isValidURL(block))
        .join(" ") || "-";

    return {
      description,
      media: parsedMedia,
    };
  } catch (error) {
    throw error;
  }
};
