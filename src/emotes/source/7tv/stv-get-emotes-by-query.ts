import fetch from "node-fetch";

import { EmbeddedError } from "../../../constants/errors";
import { Messages } from "../../../constants/messages";
import type { Emote } from "../../../types";
import type { STVResponseGQL } from "../../../types/7tv";
import sleep from "../../../utils/sleep";
import { stvGetGraphqlUrl } from "./helpers/constants";
import stvGetGraphqlRequestOptions from "./helpers/stv-get-graphql-request-options";
import stvTransformSourceUrl from "./helpers/stv-transform-source-url";

import { BotConsole } from "#/loggers";

const MAX_TRIES = 3;
const RETRY_DELAY_MS = 1000;

type SearchData = NonNullable<STVResponseGQL["data"]>;

type SearchAttempt =
  | { status: "ok"; data: SearchData }
  | { status: "not-found" }
  // The request itself is invalid, so retrying cannot help
  | { status: "rejected"; message: string }
  // Network error, bad HTTP status or a backend failure that may pass
  | { status: "transient"; reason: string };

const trySearch = async (query: string): Promise<SearchAttempt> => {
  let response: Awaited<ReturnType<typeof fetch>>;

  try {
    response = await fetch(stvGetGraphqlUrl, stvGetGraphqlRequestOptions(query));
  } catch (error) {
    return { status: "transient", reason: String(error) };
  }

  if (!response.ok) {
    return { status: "transient", reason: `HTTP ${response.status}` };
  }

  let body: STVResponseGQL;

  try {
    body = (await response.json()) as STVResponseGQL;
  } catch {
    return { status: "transient", reason: "response is not valid JSON" };
  }

  if (body.errors?.length) {
    if (body.errors[0]?.message.includes("70429")) return { status: "not-found" };

    // Only syntax and validation errors lack `path` and `extensions`; anything else may be
    // a backend failure and keeps the retries.
    const isRequestError = body.errors.every(
      (error) => error.locations && !error.path && !error.extensions
    );

    return isRequestError
      ? { status: "rejected", message: body.errors[0].message.slice(0, 300) }
      : { status: "transient", reason: body.errors[0].message.slice(0, 300) };
  }

  if (!Array.isArray(body.data?.emotes?.items)) {
    return { status: "transient", reason: "unexpected response shape" };
  }

  return { status: "ok", data: body.data };
};

const stvGetEmotesByQuery = async (query: string): Promise<Emote[]> => {
  let data: SearchData | undefined;

  for (let attempt = 1; attempt <= MAX_TRIES && !data; attempt++) {
    const result = await trySearch(query);

    if (result.status === "ok") {
      data = result.data;
    } else if (result.status === "not-found") {
      throw new EmbeddedError(Messages.EMOTE_NOT_FOUND);
    } else if (result.status === "rejected") {
      throw new Error(`7TV rejected the search request: ${result.message}`);
    } else {
      BotConsole.warn(`7TV search failed (${attempt}/${MAX_TRIES}): ${result.reason}`);
      if (attempt < MAX_TRIES) await sleep(RETRY_DELAY_MS);
    }
  }

  if (!data) {
    throw new EmbeddedError({
      title: "7TV is unavailable",
      description:
        "7TV search is not responding right now. Try again later or use another source (BTTV, FFZ).",
    });
  }

  const emotes: Emote[] = data.emotes.items.map((emote) => {
    const { animated, host, id, name, owner } = emote;

    const urls = stvTransformSourceUrl(host.url, animated);

    return {
      animated,
      author: owner?.display_name || "DeletedUser",
      file: {
        preview: urls["2x"],
        url: urls["3x"],
      },
      id,
      name,
      origin: "7tv",
    };
  });

  return emotes;
};

export default stvGetEmotesByQuery;
