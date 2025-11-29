import fetch from "node-fetch";

import { MAX_EMOTE_SIZE } from "@/constants";
import { EmbeddedError } from "@/constants/errors";
import { getRemoteResourceDetails } from "@/utils";

import { Emote } from "../../../types";

const getEmoteFromUrl = async (sourceUrl: string): Promise<Emote> => {
  try {
    const { size, mimeType } = (await getRemoteResourceDetails(sourceUrl)) ?? {};

    if (size && size > MAX_EMOTE_SIZE) {
      throw new EmbeddedError({
        title: "Resource too large",
        description:
          "The resource you are trying to fetch is too large to be processed by Tetra.",
      });
    }

    if (mimeType && !/^image\/(gif|jpe?g|png|webp)/.test(mimeType)) {
      throw new EmbeddedError({
        title: "Not supported file.",
        description: "The file you are trying to upload is not supported by Tetra.",
      });
    }

    const response = await fetch(sourceUrl);

    if (!response.ok)
      throw new EmbeddedError({
        title: "Request to source failed.",
        description: "The request to the source failed.",
      });

    return {
      animated: mimeType?.includes("gif") ?? false,
      author: "-",
      file: {
        preview: sourceUrl,
        url: sourceUrl,
      },
      id: sourceUrl,
      name: "Emote name",
      origin: "source",
    };
  } catch (error) {
    throw new EmbeddedError({
      title: "Failed to fetch source file.",
      description: "File is not available or not found. Maybe the URL is invalid.",
    });
  }
};

export default getEmoteFromUrl;
