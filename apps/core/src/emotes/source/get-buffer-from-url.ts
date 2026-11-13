import { sleep } from "bun";

import { EmbeddedError } from "@/constants/errors";
import { safeFetch } from "@/lib/network/url-guard";

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
      const response = await safeFetch(url);

      if (!response.ok) {
        // 4xx won't succeed on retry
        if (response.status >= 400 && response.status < 500) {
          throw new EmbeddedError({
            title: "Failed to fetch source file.",
            description: `The source responded with ${response.status}. Maybe the URL is invalid or the file was removed.`,
          });
        }
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const tooLarge = new EmbeddedError({
        title: "Resource too large",
        description:
          "The resource you are trying to fetch is too large to be processed by Tetra.",
      });

      const declaredSize = Number(response.headers.get("content-length"));
      if (maxBufferSize && declaredSize > maxBufferSize) throw tooLarge;

      const buffer = Buffer.from(await response.arrayBuffer());

      if (maxBufferSize && buffer.byteLength > maxBufferSize) throw tooLarge;

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
