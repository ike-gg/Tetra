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

/** Returns the parsed body of a successful response, throws `ApiError` otherwise. */
export const unwrap = async <T>(request: Promise<ClientResponse<T>>): Promise<T> => {
  const response = await request;

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      body?.error ?? response.statusText,
      body?.reference
    );
  }

  // 204, and 200 with an empty body (`/me/state`), have nothing to parse
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
};
