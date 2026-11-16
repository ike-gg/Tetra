import { downloadVideoPost } from "./helper/download-video";
import { YtDlpError } from "./helper/yt-dlp";
import type { PlatformHandlerCallback } from "./types";

const PLATFORM = "Kick";

export const handleKickClip: PlatformHandlerCallback = async (
  url,
  { fileLimit, signal }
) => {
  try {
    const { media, videos } = await downloadVideoPost(url, {
      platform: PLATFORM,
      // Clips only (`?clip=` and `/clips/<id>`): VODs and live streams answer "unsupported"
      extractors: "kick:clip",
      fileLimit,
      signal,
    });

    const clip = videos[0];

    return {
      description: clip?.title ?? undefined,
      media,
      metadata: clip && {
        author: clip.channel ?? clip.uploader ?? undefined,
        date: clip.timestamp ? new Date(clip.timestamp * 1000) : undefined,
        views: clip.view_count ?? undefined,
      },
    };
  } catch (error) {
    if (error instanceof YtDlpError) throw error.toEmbedded(PLATFORM);
    throw error;
  }
};
