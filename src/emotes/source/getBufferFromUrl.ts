import { sleep } from "bun";
import fetch from "node-fetch";

import { EmbeddedError } from "@/constants/errors";

interface GetBufferOptions {
  maxRetries: number;
  msBetweenRetries: number;
  maxBufferSize?: number;
}

type GetBufferOptionsArg = Partial<GetBufferOptions>;

const DEFAULT_OPTIONS: GetBufferOptions = {
  maxRetries: 3,
  msBetweenRetries: 1000,
};

async function getBufferFromUrl(
  url: string,
  options?: GetBufferOptionsArg
): Promise<Buffer> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { maxRetries, msBetweenRetries, maxBufferSize } = config;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.buffer();

      if (maxBufferSize && buffer.byteLength > maxBufferSize) {
        throw new EmbeddedError({
          title: "Resource too large",
          description:
            "The resource you are trying to fetch is too large to be processed by Tetra.",
        });
      }

      return buffer;
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
