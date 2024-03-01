import fetch from "node-fetch";
import { MediaOutput, PlatformResult } from "../../commands/media";
import isValidURL from "../isValidURL";
import { FeedbackManager } from "../managers/FeedbackManager";
import * as z from "zod";

const apiResponseSchema = z.object({
  mediaURLs: z.array(z.string().url()),
  text: z.string(),
  date_epoch: z.number(),
  user_name: z.string(),
  likes: z.number(),
});

export const handleTwitterMedia = async (
  _url: string,
  feedback: FeedbackManager
): Promise<PlatformResult> => {
  try {
    const { pathname: pathnameFull } = new URL(_url);

    const pathname = pathnameFull.split("/").slice(0, 4).join("/");

    const apiUrl = new URL(pathname, "https://api.vxtwitter.com/").href;

    const request = await fetch(apiUrl);
    const tweetData = await request.json();

    if (!request.ok) {
      if ("error" in tweetData) {
        throw new Error(tweetData.error);
      } else {
        throw new Error("Request to API failed.");
      }
    }

    const { mediaURLs, text, date_epoch, likes, user_name } =
      apiResponseSchema.parse(tweetData);

    const parsedMedia: MediaOutput[] = await Promise.all(
      mediaURLs.map(async (item): Promise<MediaOutput> => {
        const request = await fetch(item, { method: "HEAD" });
        const headers = request.headers;

        const contentType = headers.get("content-type");
        const contentSize = headers.get("content-length");

        const isVideo = contentType?.includes("video");
        return {
          source: item,
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
      description: description,
      media: parsedMedia,
      metadata: {
        author: user_name,
        date: new Date(date_epoch * 1000),
        likes: likes,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error("Received wrong response from API.");
    } else {
      throw error;
    }
  }
};
