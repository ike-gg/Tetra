export type WebpJob = { buffer: ArrayBuffer; maxBytes: number };

export type WebpReply =
  | { type: "progress"; done: number; total: number }
  | { type: "done"; gif: ArrayBuffer }
  | { type: "still" }
  | { type: "error"; kind: "unsupported" | "failed"; message?: string }
  | { type: "error"; kind: "too-big"; bytes: number };

/** The GIF would pass `maxBytes`; `bytes` is how far it got before stopping. */
export class WebpTooBigError extends Error {
  constructor(public readonly bytes: number) {
    super("the animation is too big as a GIF");
    this.name = "WebpTooBigError";
  }
}

type ConvertOptions = {
  maxBytes: number;
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
};

/**
 * An animated WebP as a GIF, decoded with WebCodecs' `ImageDecoder` and encoded with
 * gifenc in a worker (both load only when a WebP needs it; aborting terminates the
 * worker). Resolves to null when the browser can't decode it (no `ImageDecoder`, or it
 * failed) or it has a single frame: the caller then opens the WebP as a still image.
 * Throws `WebpTooBigError` past `maxBytes`, and the abort reason when aborted.
 */
export const convertWebpToGif = (
  buffer: ArrayBuffer,
  { maxBytes, signal, onProgress }: ConvertOptions
) =>
  new Promise<ArrayBuffer | null>((resolve, reject) => {
    signal?.throwIfAborted();
    if (typeof ImageDecoder === "undefined") return resolve(null);

    const worker = new Worker(new URL("./webp-to-gif-worker.ts", import.meta.url), {
      type: "module",
    });
    const finish = () => {
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      finish();
      reject(signal?.reason);
    };
    signal?.addEventListener("abort", abort, { once: true });

    worker.onmessage = ({ data }: MessageEvent<WebpReply>) => {
      if (data.type === "progress") return onProgress?.(data.done, data.total);
      finish();
      if (data.type === "done") return resolve(data.gif);
      if (data.type === "error" && data.kind === "too-big") {
        return reject(new WebpTooBigError(data.bytes));
      }
      if (data.type === "error" && data.message) {
        console.warn("Converting the animated WebP failed:", data.message);
      }
      resolve(null);
    };
    worker.onerror = (event) => {
      console.warn("Converting the animated WebP failed:", event.message);
      finish();
      resolve(null);
    };

    const job: WebpJob = { buffer: buffer.slice(0), maxBytes };
    worker.postMessage(job, [job.buffer]);
  });
