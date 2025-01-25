import { MediaOutput, PlatformHandlerCallback } from "../../commands/media";

import { fetchCobaltAPI } from "./helper/fetchCobaltAPI";
import { getRemoteResourceDetails } from "../../utils";
import { EmbeddedError } from "../../constants/errors";

// for ig cobalt is used,
// it supports only: static posts and reels
// things like stories are not supported

export const handleInstagramMedia: PlatformHandlerCallback = async (url, feedback) => {
  try {
    const post = await fetchCobaltAPI(url);

    // post includes multiple files
    if (post.picker) {
      const mediaDetails: MediaOutput[] = await Promise.all(
        post.picker.map(async (item): Promise<MediaOutput> => {
          const { size } = (await getRemoteResourceDetails(item.url)) ?? {};

          let itemType: MediaOutput["type"] = "jpg";

          if (item.type === "video") itemType = "mp4";

          return {
            type: itemType,
            source: item.url,
            size: size || undefined,
          };
        })
      );

      return {
        media: mediaDetails,
      };
    }

    // post contain a single file
    if (post.url) {
      const { mimeType, size } = (await getRemoteResourceDetails(post.url)) ?? {};
      const type = mimeType?.includes("video") ? "mp4" : "jpg";

      return {
        media: [
          {
            type,
            size,
            source: post.url,
          },
        ],
      };
    }

    throw new Error("Nothing found");
  } catch (error) {
    if (error instanceof EmbeddedError) {
      throw new EmbeddedError(`Instagram post not found.
-# Only static posts and reels are supported.
-# Stories are not supported.`);
    } else {
      throw error;
    }
  }
};
