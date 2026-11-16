import fs from "node:fs";
import path from "node:path";
import * as z from "zod";

import { ensureH264 } from "./ensure-h264";
import {
  classifyToolError,
  FileLimitExceededError,
  mediaToolError,
} from "./media-errors";
import { runCommand } from "./run-command";

const EXTRACT_TIMEOUT_MS = 60_000;
const DOWNLOAD_TIMEOUT_MS = 180_000;

// H.264 first so Discord plays it everywhere, then the largest resolution up to `res`
const formatSort = (res: number) => `vcodec:h264,res:${res},acodec:aac,ext:mp4:m4a`;
// Twitch clips are ~8 Mbit/s at 720p, so long clips only fit at a lower resolution
const RESOLUTION_LADDER = [720, 480, 360];
// Rough floor for any usable format: longer videos fit the limit at no resolution
const MIN_BYTES_PER_SECOND = 250_000 / 8;

const videoSchema = z.object({
  id: z.string(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  uploader: z.string().nullish(),
  creator: z.string().nullish(),
  channel: z.string().nullish(),
  timestamp: z.number().nullish(),
  duration: z.number().nullish(),
  like_count: z.number().nullish(),
  view_count: z.number().nullish(),
});

const infoSchema = z.union([
  z.object({
    _type: z.literal("playlist"),
    entries: z.array(videoSchema),
  }),
  videoSchema.extend({ _type: z.literal("video").optional() }),
]);

export type YtDlpVideo = z.infer<typeof videoSchema>;

export interface YtDlpInfo {
  videos: YtDlpVideo[];
  /** Raw JSON, handed back to yt-dlp for the download so the post isn't extracted twice. */
  raw: string;
}

export interface YtDlpOptions {
  platform: string;
  /** `--use-extractors` value; keeps yt-dlp off its generic extractor (no arbitrary fetches). */
  extractors: string;
  cookies?: string;
}

const baseArgs = ({ cookies }: YtDlpOptions) => [
  "--ignore-config",
  "--no-warnings",
  "--no-cache-dir",
  "--socket-timeout",
  "20",
  ...(cookies ? ["--cookies", cookies] : []),
];

export class YtDlpError extends Error {
  constructor(
    public readonly failure: ReturnType<typeof classifyToolError>,
    public readonly stderr: string
  ) {
    super(`yt-dlp failed: ${failure}`);
    this.name = "YtDlpError";
  }

  toEmbedded(platform: string) {
    return mediaToolError(this.failure, platform, this.stderr);
  }
}

export const fetchVideoInfo = async (url: string, options: YtDlpOptions) => {
  const result = await runCommand(
    [
      "yt-dlp",
      ...baseArgs(options),
      "--use-extractors",
      options.extractors,
      "-J",
      "-S",
      formatSort(RESOLUTION_LADDER[0] as number),
      "--",
      url,
    ],
    { timeoutMs: EXTRACT_TIMEOUT_MS }
  );

  if (result.timedOut) throw new YtDlpError("timeout", result.stderr);
  if (result.exitCode !== 0) {
    throw new YtDlpError(classifyToolError(result.stderr), result.stderr);
  }

  let json: unknown;
  try {
    json = JSON.parse(result.stdout);
  } catch {
    throw new YtDlpError("unknown", "yt-dlp printed invalid JSON");
  }

  const parsed = infoSchema.safeParse(json);
  if (!parsed.success) throw new YtDlpError("unknown", parsed.error.message);

  const info = parsed.data;
  const videos = info._type === "playlist" ? info.entries : [info];

  return { videos, raw: result.stdout } satisfies YtDlpInfo;
};

const downloadAttempt = async (
  infoPath: string,
  dir: string,
  res: number,
  fileLimit: number,
  options: YtDlpOptions
) => {
  fs.mkdirSync(dir);

  const result = await runCommand(
    [
      "yt-dlp",
      ...baseArgs(options),
      "--load-info-json",
      infoPath,
      // Formats are re-selected from the loaded JSON, so each attempt can pick a lower one
      "-S",
      formatSort(res),
      // Checked against the metadata or Content-Length before anything is downloaded
      "--max-filesize",
      String(fileLimit),
      "--merge-output-format",
      "mp4",
      "--remux-video",
      "mp4",
      "--no-progress",
      "-o",
      path.join(dir, "%(autonumber)s.%(ext)s"),
      "--print",
      "after_move:filepath",
    ],
    { timeoutMs: DOWNLOAD_TIMEOUT_MS }
  );

  if (result.timedOut) throw new YtDlpError("timeout", result.stderr);
  if (result.exitCode !== 0) {
    throw new YtDlpError(classifyToolError(result.stderr), result.stderr);
  }

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && path.dirname(line) === dir && fs.existsSync(line));
};

/**
 * Downloads the extracted videos into `dir` and returns them in order, stepping down the
 * resolution ladder until everything fits `fileLimit`.
 */
export const downloadVideos = async (
  info: YtDlpInfo,
  dir: string,
  fileLimit: number,
  options: YtDlpOptions
): Promise<Buffer[]> => {
  const minimumSize = info.videos.reduce(
    (sum, video) => sum + (video.duration ?? 0) * MIN_BYTES_PER_SECOND,
    0
  );
  if (minimumSize > fileLimit) throw new FileLimitExceededError();

  const infoPath = path.join(dir, "info.json");
  fs.writeFileSync(infoPath, info.raw);

  for (const res of RESOLUTION_LADDER) {
    const attemptDir = path.join(dir, String(res));
    const files = await downloadAttempt(infoPath, attemptDir, res, fileLimit, options);

    // --max-filesize skips a file silently (exit code 0, nothing printed)
    if (files.length < info.videos.length) continue;

    const buffers: Buffer[] = [];
    for (const file of files) {
      buffers.push(fs.readFileSync(await ensureH264(file, fileLimit)));
    }
    const total = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
    if (total <= fileLimit) return buffers;
  }

  throw new FileLimitExceededError();
};
