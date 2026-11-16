import { EmbeddedError } from "@/constants/errors";

import { downloadVideoPost, videoDate } from "./helper/download-video";
import { YtDlpError, type YtDlpVideo } from "./helper/yt-dlp";
import type { PlatformHandlerCallback } from "./types";

const PLATFORM = "YouTube";
const MAX_DURATION_S = 90;

const VIDEO_ID = /^[\w-]{11}$/;
const PATH_ID = /^\/(shorts|embed|live|v)\/([\w-]{11})\/?$/;
const NOT_VIDEO_STATUSES = new Set(["is_live", "is_upcoming", "post_live"]);

const youtubeError = (message: string) => new EmbeddedError(`${PLATFORM}: ${message}`);

const unsupportedError = () =>
  youtubeError(
    `i can only download single videos and shorts up to ${MAX_DURATION_S} seconds, not channels, playlists or live streams`
  );
const liveError = () => youtubeError("i can't download live streams or premieres");

const formatDuration = (seconds: number) => {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  if (minutes === 0) return `${rest} s`;
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
};

/**
 * One video id from a YouTube link, rebuilt as a canonical URL so playlist, timestamp and
 * tracking params never reach yt-dlp. Undefined for channels, playlists, search and the rest.
 */
export const canonicalYouTubeUrl = (input: string) => {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return undefined;
  }

  const host = url.hostname.toLowerCase();
  let id: string | null | undefined;
  let shorts = false;

  if (host === "youtu.be") {
    id = url.pathname.replace(/^\/|\/$/g, "");
  } else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    if (url.pathname === "/watch") {
      id = url.searchParams.get("v");
    } else {
      const match = url.pathname.match(PATH_ID);
      shorts = match?.[1] === "shorts";
      id = match?.[2];
    }
  }

  if (!id || !VIDEO_ID.test(id)) return undefined;
  return shorts
    ? `https://www.youtube.com/shorts/${id}`
    : `https://www.youtube.com/watch?v=${id}`;
};

// Runs on the `-J` metadata, before anything is downloaded
const checkVideo = (videos: YtDlpVideo[]) => {
  const [video] = videos;
  if (!video || videos.length > 1) throw unsupportedError();
  if (video.live_status && NOT_VIDEO_STATUSES.has(video.live_status)) throw liveError();
  if (!video.duration) {
    throw youtubeError("i couldn't tell how long this video is, so i can't download it");
  }
  if (video.duration > MAX_DURATION_S) {
    throw youtubeError(
      `i can only download videos up to ${MAX_DURATION_S} seconds, and this one is ${formatDuration(video.duration)}`
    );
  }
};

// `uploader_id` is the `@handle`; older channels may only have a name
const author = (video: YtDlpVideo) =>
  video.uploader_id?.startsWith("@")
    ? video.uploader_id.slice(1)
    : (video.channel ?? video.uploader ?? undefined);

export const handleYouTubeVideo: PlatformHandlerCallback = async (
  url,
  { fileLimit, signal }
) => {
  const canonicalUrl = canonicalYouTubeUrl(url);
  if (!canonicalUrl) throw unsupportedError();

  try {
    const { media, videos } = await downloadVideoPost(canonicalUrl, {
      platform: PLATFORM,
      // Single videos only: `youtube:tab` (channels, playlists) and search stay off
      extractors: "youtube",
      fileLimit,
      signal,
      check: checkVideo,
    });

    const video = videos[0];

    return {
      description: video?.title ?? undefined,
      media,
      url: canonicalUrl,
      metadata: video && {
        author: author(video),
        date: videoDate(video),
        likes: video.like_count ?? undefined,
        views: video.view_count ?? undefined,
      },
    };
  } catch (error) {
    if (error instanceof YtDlpError) {
      // Upcoming streams and premieres fail extraction with "This live event will begin in …"
      const stderr = error.stderr.toLowerCase();
      if (stderr.includes("live event") || stderr.includes("premieres in")) {
        throw liveError();
      }
      throw error.toEmbedded(PLATFORM);
    }
    throw error;
  }
};
