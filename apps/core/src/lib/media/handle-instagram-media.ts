import fs from "node:fs";

import { EmbeddedError, ResourceTooLargeError } from "@/constants/errors";
import getBufferFromUrl from "@/emotes/source/get-buffer-from-url";
import { env } from "@/env";

import { prepareCookies } from "./helper/cookies";
import { downloadVideoPost, videoMetadata } from "./helper/download-video";
import { fetchGallery, GalleryDlError } from "./helper/gallery-dl";
import { FileLimitExceededError } from "./helper/media-errors";
import { YtDlpError } from "./helper/yt-dlp";
import type { MediaOutput, PlatformHandlerCallback } from "./types";

import { TempFileManager } from "#/files/temp-file-manager";

const PLATFORM = "Instagram";
// Discord takes at most 10 attachments per message
const MAX_ITEMS = 10;
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm"]);

const loginRequiredError = () =>
  new EmbeddedError({
    title: PLATFORM,
    description: `Instagram only shows photo posts to logged-in users, so they can't be downloaded right now.
-# Reels and video posts work.`,
  });

// yt-dlp only extracts videos; photo posts (and mixed carousels' photos) need gallery-dl,
// which Instagram only serves with a logged-in session (MEDIA_COOKIES)
const handlePhotoPost = async (url: string, fileLimit: number) => {
  if (!env.MEDIA_COOKIES) throw loginRequiredError();

  const dir = TempFileManager.create();
  let files: Awaited<ReturnType<typeof fetchGallery>>["files"];
  try {
    ({ files } = await fetchGallery(url, { cookies: prepareCookies(dir) }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  let total = 0;
  const media: MediaOutput[] = [];

  for (const file of files.slice(0, MAX_ITEMS)) {
    const remaining = fileLimit - total;
    if (remaining <= 0) throw new FileLimitExceededError();
    const buffer = await getBufferFromUrl(file.url, {
      maxBufferSize: remaining,
      maxRetries: 2,
      timeoutMs: 30_000,
    }).catch((error: unknown) => {
      if (error instanceof ResourceTooLargeError) {
        throw new FileLimitExceededError();
      }
      throw error;
    });

    total += buffer.byteLength;
    media.push({
      type: VIDEO_EXTENSIONS.has(file.extension)
        ? "mp4"
        : file.extension === "png"
          ? "png"
          : "jpg",
      source: buffer,
      size: buffer.byteLength,
    });
  }

  return { media };
};

export const handleInstagramMedia: PlatformHandlerCallback = async (
  url,
  { fileLimit }
) => {
  try {
    try {
      const { media, videos } = await downloadVideoPost(url, {
        platform: PLATFORM,
        extractors: "Instagram",
        fileLimit,
      });

      return {
        media: media.slice(0, MAX_ITEMS),
        metadata: videos[0] && videoMetadata(videos[0]),
      };
    } catch (error) {
      if (error instanceof YtDlpError && error.failure === "no-video") {
        return await handlePhotoPost(url, fileLimit);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof GalleryDlError && error.failure === "login-required") {
      throw loginRequiredError();
    }
    if (error instanceof YtDlpError || error instanceof GalleryDlError) {
      throw error.toEmbedded(PLATFORM);
    }
    throw error;
  }
};
