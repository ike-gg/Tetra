import { MediaOutput, PlatformResult } from "../../commands/media";

import { FeedbackManager } from "../managers/FeedbackManager";
import fetch from "node-fetch";
import * as z from "zod";

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

    if (!videoId) throw new Error("Invalid Streamable URL (id not found)");

    const url = new URL(videoId, "https://api.streamable.com/videos/").href;

    const request = await fetch(url);

    if (request.status !== 200) {
      const error = await request.text();
      throw new Error("Streamable API error: " + error);
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
      throw new Error("Received wrong response from API.");
    } else {
      throw error;
    }
  }
};
