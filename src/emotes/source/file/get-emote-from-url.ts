import prettyBytes from "pretty-bytes";

import { MAX_SUPPORTED_SIZE } from "@/constants";
import { EmbeddedError } from "@/constants/errors";
import { getRemoteResourceDetails } from "@/utils";

import { Emote } from "../../../types";

const getEmoteFromUrl = async (sourceUrl: string): Promise<Emote> => {
  // Best-effort HEAD check; some hosts don't support it. The file is validated again on download.
  const { size, mimeType } = (await getRemoteResourceDetails(sourceUrl)) ?? {};

  // Files above Discord's limit are fine, they get optimized later.
  if (size && size > MAX_SUPPORTED_SIZE) {
    throw new EmbeddedError({
      title: "Resource too large",
      description: `The file is larger than ${prettyBytes(MAX_SUPPORTED_SIZE)}, which is the maximum Tetra can process.`,
    });
  }

  if (mimeType && !/^image\/(gif|jpe?g|png|webp|avif)/.test(mimeType)) {
    throw new EmbeddedError({
      title: "Not supported file.",
      description: "The file you are trying to upload is not supported by Tetra.",
    });
  }

  return {
    // provisional, ProcessingEmoteService.store detects it from the file
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
};

export default getEmoteFromUrl;
