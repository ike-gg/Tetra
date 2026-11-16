import fs from "node:fs";
import path from "node:path";
import * as z from "zod";

import { runCommand } from "./run-command";

import { BotConsole } from "#/loggers";

const TRANSCODE_TIMEOUT_MS = 180_000;
const AUDIO_KBPS = 128;

const probeSchema = z.object({
  streams: z.array(
    z.object({ codec_type: z.string().optional(), codec_name: z.string().optional() })
  ),
  format: z.object({ duration: z.coerce.number().optional() }).optional(),
});

const probe = async (file: string, signal?: AbortSignal) => {
  const result = await runCommand(
    [
      "ffprobe",
      "-v",
      "error",
      "-show_entries",
      "stream=codec_type,codec_name:format=duration",
      "-of",
      "json",
      file,
    ],
    { timeoutMs: 15_000, signal }
  );
  if (result.exitCode !== 0) return undefined;

  try {
    const parsed = probeSchema.safeParse(JSON.parse(result.stdout));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Returns `file` when it is H.264 and fits `maxBytes`, otherwise an H.264/AAC copy with
 * the short side capped at 720 px, at most 30 fps, and a bitrate cap that fits `maxBytes`.
 * Platforms serve HEVC (all Twitch clip formats as of 2026-11) with no codec in the
 * metadata, Discord doesn't play HEVC in every client, and some sources (Kick clips) have
 * a single format larger than the upload limit.
 */
export const fitVideo = async (
  file: string,
  maxBytes: number,
  signal?: AbortSignal
): Promise<string> => {
  const info = await probe(file, signal);
  const video = info?.streams.find((stream) => stream.codec_type === "video");
  if (!info || !video) return file;

  const tooLarge = fs.statSync(file).size > maxBytes;
  if (video.codec_name === "h264" && !tooLarge) return file;

  const audio = info.streams.find((stream) => stream.codec_type === "audio");
  const duration = info.format?.duration || 60;
  const videoKbps = Math.round(
    Math.min(5000, Math.max(300, (maxBytes * 8 * 0.9) / duration / 1000 - AUDIO_KBPS))
  );

  const output = path.join(
    path.dirname(file),
    `${path.basename(file, path.extname(file))}.h264.mp4`
  );

  const result = await runCommand(
    [
      "ffmpeg",
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      file,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-maxrate",
      `${videoKbps}k`,
      "-bufsize",
      `${videoKbps * 2}k`,
      "-vf",
      "scale='if(gte(iw,ih),-2,min(720,iw))':'if(gte(iw,ih),min(720,ih),-2)'",
      "-fpsmax",
      "30",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      audio?.codec_name === "aac" ? "copy" : "aac",
      ...(audio?.codec_name === "aac" ? [] : ["-b:a", `${AUDIO_KBPS}k`]),
      "-movflags",
      "+faststart",
      output,
    ],
    { timeoutMs: TRANSCODE_TIMEOUT_MS, signal }
  );

  if (result.exitCode !== 0 || result.timedOut) {
    // Keep the original: the caller rejects it if it is still too large
    BotConsole.warn("[media] H.264 transcode failed:", result.stderr.slice(-500));
    return file;
  }

  return output;
};
