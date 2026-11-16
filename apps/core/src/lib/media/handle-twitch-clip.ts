import { downloadVideoPost } from "./helper/download-video";
import { YtDlpError } from "./helper/yt-dlp";
import type { PlatformHandlerCallback } from "./types";

const PLATFORM = "Twitch";

export const handleTwitchClip: PlatformHandlerCallback = async (url, { fileLimit }) => {
  try {
    const { media, videos } = await downloadVideoPost(url, {
      platform: PLATFORM,
      // Clips only: VODs and streams are far over any upload limit
      extractors: "twitch:clips",
      fileLimit,
    });

    const clip = videos[0];

    return {
      description: clip?.title
        ? `${clip.title}${clip.uploader ? `\n*Clipped by: ${clip.uploader}*` : ""}`
        : undefined,
      media,
      metadata: clip && {
        // yt-dlp: `creator` is the broadcaster, `uploader` the person who clipped it
        author: clip.creator ?? clip.channel ?? undefined,
        date: clip.timestamp ? new Date(clip.timestamp * 1000) : undefined,
        views: clip.view_count ?? undefined,
      },
    };
  } catch (error) {
    if (error instanceof YtDlpError) throw error.toEmbedded(PLATFORM);
    throw error;
  }
};
