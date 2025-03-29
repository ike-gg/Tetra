import fetch from "node-fetch";
import { ZodError, z } from "zod";

import { PlatformResult } from "../../commands/media";
import { EmbeddedError } from "../../constants/errors";
import { getRemoteResourceDetails } from "../../utils";
import { FeedbackManager } from "../../utils/managers/FeedbackManager";
import { TwitchManager } from "../../utils/managers/TwitchManager";
import { fetchCobaltAPI } from "./helper/fetchCobaltAPI";

export const handleTwitchClip = async (
  _url: string,
  feedback: FeedbackManager
): Promise<PlatformResult> => {
  const url = new URL(_url);

  if (url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  const clipId = url.pathname.split("/").pop();

  if (!clipId) throw new EmbeddedError("Invalid clip ID.");

  const clip = await TwitchManager.getClip(clipId);

  if (!clip) throw new EmbeddedError("Clip not found.");

  const media = await fetchCobaltAPI(_url, {
    videoQuality: "720",
  });

  if (!media.url) {
    throw new EmbeddedError("Media for clip not found (cobalt error).");
  }

  const mediaDetauls = await getRemoteResourceDetails(media.url);

  return {
    description: `${clip.title}
    *Clipped by: ${clip.creator_name}*`,
    media: [
      {
        source: media.url,
        type: "mp4",
        size: mediaDetauls?.size,
      },
    ],
    metadata: {
      author: clip.broadcaster_name,
      date: new Date(clip.created_at),
      views: clip.view_count,
    },
  };
};
