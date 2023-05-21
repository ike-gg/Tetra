import { Emote } from "../../../types";
import { FFZResponseById } from "../../../types/ffz";
import { ffzGetUrlById } from "./helpers/constants";

const ffzGetEmoteById = async (emoteId: string): Promise<Emote> => {
  const response = await fetch(ffzGetUrlById(emoteId));

  if (response.status === 404) {
    throw new Error("Emote might have been deleted. `FFZ_REQUEST_ID_404`");
  }

  if (!response.ok) {
    throw new Error(
      `Request failed, try again in a while. \`FFZ_REQUEST_ID_NOT_OK\``
    );
  }

  const data = (await response.json()) as FFZResponseById;

  const { id, name, owner, urls, animated } = data.emote;

  const isAnimated = animated ? true : false;

  let urlPreview: string | undefined;
  let urlSource: string | undefined;

  if (animated) {
    if (animated[2]) {
      urlPreview = `${animated[2]}.gif`;
      urlSource = `${animated[2]}.gif`;
    } else if (animated[1]) {
      urlPreview = `${animated[1]}.gif`;
      urlSource = `${animated[1]}.gif`;
    }
  }

  if (!animated) {
    if (urls[2]) {
      urlPreview = urls[2];
      urlSource = urls[2];
    } else if (urls[1]) {
      urlPreview = urls[1];
      urlSource = urls[1];
    }
  }

  if (!urlPreview || !urlSource) {
    throw new Error("Emote is not available. `FFZ_LINKS_NOT_AVAILABLE`");
  }

  return {
    animated: isAnimated,
    author: owner.display_name,
    file: {
      preview: urlPreview,
      url: urlSource,
    },
    id: String(id),
    name,
    origin: "ffz",
  };
};

export default ffzGetEmoteById;
