import { MediaCommandError, PlatformResult } from "../../commands/media";
import { guildParsePremium } from "../discord/guildParsePremium";
import { FeedbackManager } from "../managers/FeedbackManager";
import yt, { type Format } from "youtube-dl-exec";

const supportedQualities = ["240p", "360p", "480p", "720p"];
const supportedLengthVideos = 60 * 5;

export const handleYoutubeMedia = async (
  _url: string,
  feedback: FeedbackManager
): Promise<PlatformResult> => {
  const { fileLimit } = guildParsePremium(feedback.interaction.guild!);

  const { formats, duration } = await yt(_url, {
    dumpSingleJson: true,
    noWarnings: true,
    preferFreeFormats: true,
  });

  if (duration > supportedLengthVideos) {
    throw new Error("For now, only videos up to 3 minutes are supported");
  }

  const eligableFormats = formats.filter((format) => {
    const { acodec, vcodec } = format;
    return acodec !== "none" && vcodec !== "none";
  });

  if (eligableFormats.length === 0) {
    throw new Error("No supported format found with audio and video.");
  }

  const formatsWithSize = await Promise.all(
    eligableFormats.map(async (format): Promise<Format> => {
      const request = await fetch(format.url, { method: "HEAD" });
      const headers = request.headers;

      const size = headers.get("Content-Length");

      return {
        ...format,
        filesize: Number(size),
      };
    })
  );

  const selectedFormat = formatsWithSize
    .sort((a, b) => b.filesize! - a.filesize!)
    .find((format) => format.filesize! < fileLimit);

  if (!selectedFormat) {
    throw MediaCommandError.FILE_LIMIT_EXCEEDED;
  }

  return {
    description: "",
    media: [
      {
        source: selectedFormat.url,
        type: "mp4",
        size: selectedFormat.filesize || undefined,
      },
    ],
  };
};
