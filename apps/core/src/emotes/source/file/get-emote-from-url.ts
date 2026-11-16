import { MAX_SUPPORTED_SIZE } from "@/constants";
import { EmbeddedError } from "@/constants/errors";
import { getRemoteResourceDetails } from "@/utils";
import { formatBytes } from "@/utils/format-bytes";

import type { Emote } from "../../../types";

const getEmoteFromUrl = async (sourceUrl: string): Promise<Emote> => {
  // Best-effort HEAD check; some hosts don't support it. The file is validated again on download.
  const { size, mimeType } = (await getRemoteResourceDetails(sourceUrl)) ?? {};

  // Files above Discord's limit are fine, they get optimized later.
  if (size && size > MAX_SUPPORTED_SIZE) {
    throw new EmbeddedError(
      `that file is ${formatBytes(size)} and i can process up to ${formatBytes(MAX_SUPPORTED_SIZE)}. try a smaller one`
    );
  }

  if (mimeType && !/^image\/(gif|jpe?g|png|webp|avif)/.test(mimeType)) {
    throw new EmbeddedError(
      "that file type isn't supported. use a GIF, PNG, JPEG, WebP or AVIF image"
    );
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
