import { MediaCommandError, PlatformResult } from "../../commands/media";
import { guildParsePremium } from "../discord/guildParsePremium";
import { FeedbackManager } from "../managers/FeedbackManager";
import yt, { type Format } from "youtube-dl-exec";

const supportedQualities = ["240p", "360p", "480p", "720p"];
const supportedLengthVideos = 400;

export const handleYoutubeMedia = async (
  _url: string,
  feedback: FeedbackManager
): Promise<PlatformResult> => {
  const { fileLimit } = guildParsePremium(feedback.interaction.guild!);

  const { formats, duration, channel, title, view_count, upload_date } =
    await yt(_url, {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
    });

  const year = upload_date.slice(0, 4);
  const month = upload_date.slice(4, 6);
  const day = upload_date.slice(6, 8);

  const formattedDate = `${year}-${month}-${day}`;

  if (duration > supportedLengthVideos) {
    throw new Error("For now, only videos up to 6:34 minutes are supported");
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
    description: title,
    media: [
      {
        source: selectedFormat.url,
        type: "mp4",
        size: selectedFormat.filesize || undefined,
      },
    ],
    metadata: {
      author: channel,
      views: view_count,
      date: new Date(formattedDate),
    },
  };
};
