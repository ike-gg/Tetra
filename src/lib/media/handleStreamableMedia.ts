import fetch from "node-fetch";
import * as z from "zod";

import { MediaOutput, PlatformResult } from "../../commands/media";
import { EmbeddedError } from "../../constants/errors";
import { FeedbackManager } from "../../utils/managers/FeedbackManager";

const streamableSchema = z.object({
  files: z.object({
    mp4: z.object({
      url: z.string().url(),
    }),
  }),
});

export const handleStreamableMedia = async (
  _url: string,
  feedback: FeedbackManager
): Promise<PlatformResult> => {
  try {
    const videoId = new URL(_url).pathname.split("/").at(1);

    if (!videoId) throw new EmbeddedError("Invalid Streamable URL.");

    const url = new URL(videoId, "https://api.streamable.com/videos/").href;

    const request = await fetch(url);

    if (request.status !== 200) {
      const error = await request.text();
      throw new EmbeddedError("Streamable API error: " + error);
    }

    const response = await request.json();
    const streamableData = streamableSchema.parse(response);
    const { url: videoUrl } = streamableData.files.mp4;

    const metadataRequest = await fetch(videoUrl);
    const headers = metadataRequest.headers;

    const size = Number(headers.get("Content-Length"));

    return {
      media: [
        {
          source: videoUrl,
          type: "mp4",
          size,
        },
      ],
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new EmbeddedError("Received wrong response from Streamable API.");
    } else {
      throw error;
    }
  }
};
