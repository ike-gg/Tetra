import type { z } from "zod";

import type { CatalogEmote } from "@/lib/catalog";

/** Same page size and page cap core uses for its own searches. */
export const PAGE_SIZE = 60;
export const MAX_PAGE = 100;

/** Pages are 1-based; past the last one `nextPage` is null. */
export type SearchPage = { items: CatalogEmote[]; nextPage: number | null };

export type ProviderErrorKind = "unreachable" | "rate-limited" | "failed" | "changed";

/** A provider queried straight from the browser failed; `kind` decides the message. */
export class ProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly kind: ProviderErrorKind
  ) {
    super(`${provider} request failed: ${kind}`);
    this.name = "ProviderError";
  }
}

/**
 * Fetches and validates a provider's JSON. A response that doesn't match the schema
 * throws `changed`, so an API change shows as an error instead of an empty grid.
 */
export const requestProviderJson = async <T extends z.ZodTypeAny>(
  provider: string,
  url: string,
  schema: T,
  init?: RequestInit
): Promise<z.infer<T>> => {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    throw new ProviderError(provider, "unreachable");
  }

  if (response.status === 429) throw new ProviderError(provider, "rate-limited");
  if (!response.ok) throw new ProviderError(provider, "failed");

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    throw new ProviderError(provider, "changed");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    console.error(`${provider} answered in an unexpected shape`, parsed.error.issues);
    throw new ProviderError(provider, "changed");
  }
  return parsed.data;
};
