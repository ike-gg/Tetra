import type { CatalogEmote } from "./catalog-emote";
import { emoteNotFound, headUpstream, upstreamError } from "./upstream";

const PROVIDER = "Twitch";
const CDN = "https://static-cdn.jtvnw.net/emoticons/v2";

/**
 * `default` serves the animated rendition when there is one, so its type tells whether
 * the emote is animated. Helix has no emote-by-id endpoint, so the name isn't available.
 */
export const twitchResolveEmote = async (
  id: string,
  name: string
): Promise<CatalogEmote> => {
  const url = `${CDN}/${id}/default/dark/3.0`;
  const { status, contentType } = await headUpstream(PROVIDER, url);

  if (status === 404) throw emoteNotFound();
  if (status !== 200) throw upstreamError(PROVIDER);

  return {
    id,
    name,
    previewUrl: `${CDN}/${id}/default/dark/2.0`,
    url,
    animated: contentType === "image/gif",
    source: "twitch",
  };
};
