import fetch from "node-fetch";
import * as z from "zod";

import { MediaOutput, PlatformHandlerCallback } from "../../commands/media";
import { EmbeddedError } from "../../constants/errors";
import isValidURL from "../../utils/isValidURL";

const apiResponseSchema = z.object({
  mediaURLs: z.array(z.string().url()),
  text: z.string(),
  date_epoch: z.number(),
  user_name: z.string(),
  likes: z.number(),
});

export const handleTwitterMedia: PlatformHandlerCallback = async (_url) => {
  try {
    const { pathname: pathnameFull } = new URL(_url);

    const pathname = pathnameFull.split("/").slice(0, 4).join("/");

    const apiUrl = new URL(pathname, "https://api.vxtwitter.com/").href;

    const request = await fetch(apiUrl);

    if (request.status !== 200) {
      const responseType = request.headers.get("content-type");
      if (responseType?.includes("application/json")) {
        const errorResponse = await request.json();
        if ("error" in errorResponse) {
          throw new Error("Twitter API error: " + errorResponse.error);
        } else {
          throw new Error("Twitter API error");
        }
      }
      throw new Error(`Twitter API error (${request.status})`);
    }

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
        const request = await fetch(item, {
          method: "HEAD",
        });
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

    const linkAtTheEnd = isValidURL(text.split(" ").at(-1) ?? "");

    const description = linkAtTheEnd
      ? `${text.split(" ").slice(0, -1).join(" ")}
    
_Read more on X..._`
      : text;

    return {
      description,
      media: parsedMedia,
      metadata: {
        author: user_name,
        date: new Date(date_epoch * 1000),
        likes: likes,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new EmbeddedError("X provided unexpected data.", {
        unsupportedFeature: true,
        origin: error,
      });
    } else {
      throw error;
    }
  }
};
