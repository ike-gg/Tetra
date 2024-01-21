import { PlatformResult } from "../../commands/media";
import { guildParsePremium } from "../discord/guildParsePremium";
import { FeedbackManager } from "../managers/FeedbackManager";
import yt from "youtube-dl-exec";

const supportedQualities = ["240p", "360p", "480p", "720p"];
const supportedLengthVideos = 60 * 3;

export const handleYoutubeMedia = async (
  _url: string,
  feedback: FeedbackManager
): Promise<PlatformResult> => {
  try {
    const { fileLimit } = guildParsePremium(feedback.interaction.guild!);

    const { formats, duration } = await yt(_url, {
      dumpSingleJson: true,
      noWarnings: true,
      preferFreeFormats: true,
    });

    if (duration > supportedLengthVideos) {
      throw new Error("For now, only videos up to 3 minutes are supported");
    }

    const selectedFormat = formats
      .filter((format) => {
        const { format_note, ext } = format;
        const formatQuality = String(format_note);
        return ext === "mp4" && supportedQualities.includes(formatQuality);
      })
      .filter((f) => f.filesize)
      .sort((a, b) => b.filesize! - a.filesize!)
      .find((format) => format.filesize! < fileLimit);

    if (!selectedFormat) {
      throw new Error("No supported format found (Quality/Size)");
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
  } catch (error) {
    throw new Error("Youtube fetching failed");
  }
};
