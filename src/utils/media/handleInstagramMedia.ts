import { MediaOutput, PlatformResult } from "../../commands/media";
//@ts-ignore
import instagramDl from "@sasmeee/igdl";

import { z } from "zod";
import { FeedbackManager } from "../managers/FeedbackManager";
import fetch from "node-fetch";

const instagramPiece = z.object({
  download_link: z.string().url(),
  thumbnail_link: z.string().optional(),
});

const instagramReelSchema = z.array(instagramPiece);

export const handleInstagramMedia = async (
  _url: string,
  feedback: FeedbackManager
): Promise<PlatformResult> => {
  try {
    const reelsDetails = (await instagramDl(_url)) as any[];

    const reelsData = instagramReelSchema.safeParse(reelsDetails);

    if (!reelsData.success) {
      throw new Error("Instagram failed");
    }

    const mediaDetails: MediaOutput[] = await Promise.all(
      reelsData.data.map(async (e): Promise<MediaOutput> => {
        const media = await fetch(e.download_link);
        const headers = media.headers;

        const size = Number(
          headers.get("content-length") ||
            headers.get("x-full-image-content-length")
        );
        const type = headers.get("content-type");

        const isVideo = type?.includes("video");

        return {
          type: isVideo ? "mp4" : "jpg",
          source: e.download_link,
          size,
        };
      })
    );

    return {
      media: mediaDetails,
    };
  } catch (error) {
    throw error;
  }
};
