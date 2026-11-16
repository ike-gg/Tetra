import fs from "node:fs";
import * as z from "zod";

import getBufferFromUrl from "@/emotes/source/get-buffer-from-url";

import { prepareCookies } from "./helper/cookies";
import { downloadVideoPost, videoMetadata } from "./helper/download-video";
import { fetchGallery, GalleryDlError } from "./helper/gallery-dl";
import { FileLimitExceededError } from "./helper/media-errors";
import { renderSlideshow } from "./helper/render-slideshow";
import { YtDlpError } from "./helper/yt-dlp";
import type { PlatformContext, PlatformHandlerCallback, PlatformResult } from "./types";

import { TempFileManager } from "#/files/temp-file-manager";

const PLATFORM = "TikTok";
const MAX_ASSET_SIZE = 20 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "aac"]);

const numeric = z.coerce.number().nullish().catch(undefined);

const postSchema = z
  .object({
    createTime: numeric,
    author: z.object({ uniqueId: z.string().nullish() }).nullish(),
    stats: z.object({ diggCount: numeric, playCount: numeric }).nullish(),
  })
  .catch({});

const downloadAsset = (url: string) =>
  getBufferFromUrl(url, {
    maxBufferSize: MAX_ASSET_SIZE,
    maxRetries: 2,
    timeoutMs: 20_000,
  });

// yt-dlp can't read photo posts; gallery-dl lists the images plus the post's sound
const handleSlideshow = async (
  url: string,
  { feedback, fileLimit, signal }: PlatformContext
): Promise<PlatformResult> => {
  const dir = TempFileManager.create();

  let gallery: Awaited<ReturnType<typeof fetchGallery>>;
  try {
    gallery = await fetchGallery(url, { cookies: prepareCookies(dir), signal });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  const imageUrls = gallery.files
    .filter((file) => file.type === "image" || IMAGE_EXTENSIONS.has(file.extension))
    .map((file) => file.url);
  const audioUrl = gallery.files.find(
    (file) => file.type === "audio" || AUDIO_EXTENSIONS.has(file.extension)
  )?.url;

  if (imageUrls.length === 0) {
    throw new GalleryDlError("not-found", "no images in the TikTok post");
  }

  await feedback.info("Downloading slideshow assets...");

  const [images, audio] = await Promise.all([
    Promise.all(imageUrls.map(downloadAsset)),
    // A missing sound shouldn't cost the whole slideshow
    audioUrl ? downloadAsset(audioUrl).catch(() => undefined) : undefined,
  ]);

  await feedback.info("Rendering slideshow...");

  const movie = await renderSlideshow(images, audio, signal);
  if (movie.byteLength > fileLimit) throw new FileLimitExceededError();

  const post = postSchema.parse(gallery.post ?? {});

  return {
    media: [{ type: "mp4", source: movie, size: movie.byteLength }],
    metadata: {
      author: post.author?.uniqueId ?? undefined,
      date: post.createTime ? new Date(post.createTime * 1000) : undefined,
      likes: post.stats?.diggCount ?? undefined,
      views: post.stats?.playCount ?? undefined,
    },
  };
};

export const handleTikTokMedia: PlatformHandlerCallback = async (url, context) => {
  try {
    if (new URL(url).pathname.includes("/photo/")) {
      return await handleSlideshow(url, context);
    }

    try {
      const { media, videos } = await downloadVideoPost(url, {
        platform: PLATFORM,
        extractors: "TikTok,vm.tiktok",
        fileLimit: context.fileLimit,
        signal: context.signal,
      });

      return { media, metadata: videos[0] && videoMetadata(videos[0]) };
    } catch (error) {
      // Short links (vm./vt.tiktok.com) don't show that they lead to a photo post
      if (error instanceof YtDlpError && error.failure === "unsupported") {
        return await handleSlideshow(url, context);
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof YtDlpError || error instanceof GalleryDlError) {
      throw error.toEmbedded(PLATFORM);
    }
    throw error;
  }
};
