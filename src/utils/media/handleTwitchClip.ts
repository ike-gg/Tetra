import { ZodError, z } from "zod";
import { PlatformResult } from "../../commands/media";

import { FeedbackManager } from "../managers/FeedbackManager";
import fetch from "node-fetch";
import { TwitchManager } from "../managers/TwitchManager";

export const handleTwitchClip = async (
  _url: string,
  feedback: FeedbackManager
): Promise<PlatformResult> => {
  try {
    const url = new URL(_url);
    const clipId = url.pathname.split("/").pop();

    if (!clipId) throw new Error("Invalid clip ID.");

    const clip = await TwitchManager.getClip(clipId);

    if (!clip) throw new Error("Clip not found or media missing.");

    const allQualities = [clip.hd, clip.fullhd, clip.sd];

    const formattedQualities = await Promise.all(
      await allQualities.map(async (q) => {
        const request = await fetch(q, { method: "HEAD" });
        if (!request.ok) return false;
        const headers = request.headers;
        const size = Number(headers.get("content-length"));
        return {
          src: q,
          size,
        };
      })
    );

    const availableQualities = formattedQualities.filter(Boolean);

    const quality = availableQualities.at(0);

    if (!quality) {
      throw new Error("No quality available.");
    }

    return {
      description: "",
      media: [
        {
          source: quality.src,
          type: "mp4",
          size: quality.size,
        },
      ],
    };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error("Invalid clip data.");
    } else {
      throw new Error("Twitch clip not found.");
    }
  }
};
