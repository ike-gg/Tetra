import fs from "node:fs";

import type { MediaOutput, PlatformResult } from "../types";
import { prepareCookies } from "./cookies";
import {
  downloadVideos,
  fetchVideoInfo,
  type YtDlpOptions,
  type YtDlpVideo,
} from "./yt-dlp";

import { TempFileManager } from "#/files/temp-file-manager";

/** Extracts with yt-dlp, rejects what can't fit `fileLimit`, then downloads the videos. */
export const downloadVideoPost = async (
  url: string,
  { fileLimit, ...options }: Omit<YtDlpOptions, "cookies"> & { fileLimit: number }
): Promise<{ media: MediaOutput[]; videos: YtDlpVideo[] }> => {
  const dir = TempFileManager.create();

  try {
    const ytDlpOptions = { ...options, cookies: prepareCookies(dir) };
    const info = await fetchVideoInfo(url, ytDlpOptions);
    const buffers = await downloadVideos(info, dir, fileLimit, ytDlpOptions);

    return {
      videos: info.videos,
      media: buffers.map((buffer) => ({
        type: "mp4",
        source: buffer,
        size: buffer.byteLength,
      })),
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

export const videoMetadata = (video: YtDlpVideo): PlatformResult["metadata"] => ({
  author: video.uploader ?? video.channel ?? undefined,
  date: video.timestamp ? new Date(video.timestamp * 1000) : undefined,
  likes: video.like_count ?? undefined,
  views: video.view_count ?? undefined,
});
