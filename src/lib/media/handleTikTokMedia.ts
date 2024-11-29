import { PlatformHandlerCallback, PlatformResult } from "../../commands/media";
import { Downloader } from "@tobyg74/tiktok-api-dl";
import { EmbeddedError } from "../../constants/errors";
import { getRemoteResourceDetails } from "../../utils";

export const handleTikTokMedia: PlatformHandlerCallback = async (url) => {
  const response = await Downloader(url, {
    version: "v1",
  });

  const post = response.result;

  if (response.status === "error" || !post) {
    throw new EmbeddedError(response.message ?? "TikTok not found or link is invalid.");
  }

  if (!post) {
    throw new EmbeddedError("TikTok not found or link is invalid. (Empty result)");
  }

  const { description, createTime, author, statistics } = post;

  if (post.type === "video" && post.video) {
    const videoUrl = post.video.downloadAddr.at(0);

    if (!videoUrl) throw new EmbeddedError("TikTok video not found or link is invalid");

    const resource = await getRemoteResourceDetails(videoUrl);

    return {
      media: [
        {
          size: resource?.size,
          type: "mp4",
          source: videoUrl,
        },
      ],
      description,
      metadata: {
        author: author.nickname,
        date: new Date(createTime * 1000),
        views: statistics.playCount,
        likes: statistics.diggCount,
      },
    };
  }

  // tiktok slideshow
  if (post.type === "image" && post.images) {
    const images = await Promise.all(
      post.images.map(async (image): Promise<PlatformResult["media"][0]> => {
        const resource = await getRemoteResourceDetails(image);

        return {
          size: resource?.size,
          type: "jpg",
          source: image,
        };
      })
    );

    const audioUrl = post.music.playUrl.at(0);

    return {
      media: images,
      isSlideshow: true,
      metadata: {
        author: author.nickname,
        date: new Date(createTime * 1000),
        views: statistics.playCount,
        likes: statistics.diggCount,
      },
      description,
      audio: audioUrl,
    };
  }

  throw new EmbeddedError(`TikTok found but this type of post is not supported`, {
    unsupportedFeature: true,
  });
};
