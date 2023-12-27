import { PlatformResult } from "../../commands/media";
//@ts-ignore
import instagramDl from "@sasmeee/igdl";

import { z } from "zod";
import { FeedbackManager } from "../managers/FeedbackManager";

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

    return {
      media: reelsData.data.map((e) => e.download_link),
      description: "Instagram",
    };
  } catch (error) {
    throw error;
  }
};
