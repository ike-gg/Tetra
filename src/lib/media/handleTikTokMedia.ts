import { PlatformHandlerCallback, PlatformResult } from "../../commands/media";
import { EmbeddedError } from "../../constants/errors";
import { getRemoteResourceDetails } from "../../utils";
import { fetchCobaltAPI } from "./helper/fetchCobaltAPI";

export const handleTikTokMedia: PlatformHandlerCallback = async (url) => {
  const post = await fetchCobaltAPI(url);

  if (post.status === "error" || !post) {
    throw new EmbeddedError(
      "TikTok not found or link is invalid. (Cobalt response with error status)"
    );
  }

  // tiktok slideshow
  if (post.status === "picker" && post.picker) {
    const images = await Promise.all(
      post.picker.map(async (item): Promise<PlatformResult["media"][0]> => {
        const resource = await getRemoteResourceDetails(item.url);

        return {
          size: resource?.size,
          type: "jpg",
          source: item.url,
        };
      })
    );

    const audioUrl = post.audio;

    return {
      media: images,
      isSlideshow: true,
      audio: audioUrl,
    };
  }

  if (post.url) {
    const { url } = post;

    const resource = await getRemoteResourceDetails(url);

    return {
      media: [
        {
          size: resource?.size,
          type: "mp4",
          source: url,
        },
      ],
    };
  }

  throw new EmbeddedError(`TikTok found but this type of post is not supported`, {
    unsupportedFeature: true,
  });
};
