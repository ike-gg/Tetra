import { sleep } from "bun";

import { EmbeddedError, ResourceTooLargeError } from "@/constants/errors";
import { safeFetch } from "@/lib/network/url-guard";

interface GetBufferOptions {
  maxRetries: number;
  msBetweenRetries: number;
  maxBufferSize?: number;
  /** Per attempt, covers redirects and reading the body. */
  timeoutMs?: number;
}

type GetBufferOptionsArg = Partial<GetBufferOptions>;

const DEFAULT_OPTIONS: GetBufferOptions = {
  maxRetries: 3,
  msBetweenRetries: 1000,
};

/** The source answered with a 4xx; retrying won't help. */
export class SourceRespondedError extends EmbeddedError {
  constructor(public readonly status: number) {
    super({
      title: "Failed to fetch source file.",
      keepTitle: true,
      description: `The source responded with ${status}. Maybe the URL is invalid or the file was removed.`,
    });
    this.name = "SourceRespondedError";
  }
}

// Reads the body chunk by chunk, so a missing or false Content-Length can't make us
// buffer more than the limit
const readBody = async (response: Response, maxBufferSize?: number) => {
  if (!maxBufferSize || !response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (maxBufferSize && buffer.byteLength > maxBufferSize) {
      throw new ResourceTooLargeError();
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    const { value } = chunk;
    size += value.byteLength;
    if (size > maxBufferSize) {
      void reader.cancel().catch(() => undefined);
      throw new ResourceTooLargeError();
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks, size);
};

async function getBufferFromUrl(
  url: string,
  options?: GetBufferOptionsArg
): Promise<Buffer> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { maxRetries, msBetweenRetries, maxBufferSize, timeoutMs } = config;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await safeFetch(
        url,
        timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : undefined
      );

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          throw new SourceRespondedError(response.status);
        }
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const declaredSize = Number(response.headers.get("content-length"));
      if (maxBufferSize && declaredSize > maxBufferSize) {
        void response.body?.cancel().catch(() => undefined);
        throw new ResourceTooLargeError();
      }

      return await readBody(response, maxBufferSize);
    } catch (error) {
      if (error instanceof EmbeddedError) {
        throw error;
      }

      const isLastAttempt = attempt === maxRetries;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(
        `Attempt ${attempt}/${maxRetries} failed to fetch ${url}: ${errorMessage}`
      );

      if (isLastAttempt) {
        throw new Error(
          `Failed to fetch data from ${url} after ${maxRetries} attempts: ${errorMessage}`
        );
      }

      await sleep(msBetweenRetries);
    }
  }

  // This should never be reached due to the throw in the loop,
  // but TypeScript needs this for type safety
  throw new Error("Failed to fetch data: Unexpected error");
}

export default getBufferFromUrl;
