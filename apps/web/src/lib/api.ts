import type { ApiErrorBody, AppType } from "@tetra/core/api";
import type { ClientResponse } from "hono/client";
import { hc } from "hono/client";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3002";

/** Typed client of the core API; the session cookie is sent with every request. */
export const api = hc<AppType>(`${API_URL}/api`, {
  init: { credentials: "include" },
});

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public reference?: string
  ) {
    super(message);
  }
}

const toApiError = async (response: Pick<Response, "status" | "statusText" | "json">) => {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiError(
    response.status,
    body?.error ?? response.statusText,
    body?.reference
  );
};

// Distributes over a route with several success shapes (one `c.json` per outcome)
type BodyOf<R> =
  R extends ClientResponse<infer T, infer _Status, infer _Format> ? T : never;

/** Returns the parsed body of a successful response, throws `ApiError` otherwise. */
export const unwrap = async <R extends ClientResponse<unknown>>(
  request: Promise<R>
): Promise<BodyOf<R>> => {
  const response = await request;
  if (!response.ok) throw await toApiError(response);

  // 204, and 200 with an empty body (`/me/state`), have nothing to parse
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as BodyOf<R>;
};

/** For endpoints that answer with a file: the body as a `Blob`, `ApiError` otherwise. */
export const unwrapBlob = async (
  request: Promise<ClientResponse<unknown>>
): Promise<Blob> => {
  const response = await request;
  if (!response.ok) throw await toApiError(response);
  return response.blob();
};
