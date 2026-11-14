import type { CatalogEmote } from "./catalog-emote";
import { emoteNotFound, headUpstream, upstreamError } from "./upstream";

const PROVIDER = "Discord";
const CDN = "https://cdn.discordapp.com/emojis";

/**
 * The CDN answers `.gif` with 200 for animated emojis, 415 for static ones and 404 for
 * unknown ids (verified 2026-11), so one HEAD gives both existence and type.
 */
export const discordResolveEmote = async (
  id: string,
  name: string,
  knownAnimated?: boolean
): Promise<CatalogEmote> => {
  const { status } = await headUpstream(PROVIDER, `${CDN}/${id}.gif`);

  if (status === 404) throw emoteNotFound();
  if (status !== 200 && status !== 415) throw upstreamError(PROVIDER);

  const animated = knownAnimated ?? status === 200;

  return {
    id,
    name,
    previewUrl: `${CDN}/${id}.webp?size=96${animated ? "&animated=true" : ""}`,
    url: `${CDN}/${id}.${animated ? "gif" : "png"}`,
    animated,
    source: "discord",
  };
};
