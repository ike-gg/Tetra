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

/**
 * Extracts with yt-dlp, rejects what can't fit `fileLimit`, then downloads the videos.
 * `check` runs on the extracted metadata before anything is downloaded and throws to reject.
 */
export const downloadVideoPost = async (
  url: string,
  {
    fileLimit,
    check,
    ...options
  }: Omit<YtDlpOptions, "cookies"> & {
    fileLimit: number;
    check?: (videos: YtDlpVideo[]) => void;
  }
): Promise<{ media: MediaOutput[]; videos: YtDlpVideo[] }> => {
  const dir = TempFileManager.create();

  try {
    const ytDlpOptions = { ...options, cookies: prepareCookies(dir) };
    const info = await fetchVideoInfo(url, ytDlpOptions);
    check?.(info.videos);
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

export const videoCaption = (video: YtDlpVideo) => video.description?.trim() || undefined;

const UPLOAD_DATE = /^(\d{4})(\d{2})(\d{2})$/;

export const videoDate = (video: YtDlpVideo) => {
  if (video.timestamp) return new Date(video.timestamp * 1000);
  const match = video.upload_date?.match(UPLOAD_DATE);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
};

export const videoMetadata = (video: YtDlpVideo): PlatformResult["metadata"] => ({
  author: video.uploader ?? video.channel ?? undefined,
  date: videoDate(video),
  likes: video.like_count ?? undefined,
  views: video.view_count ?? undefined,
});
