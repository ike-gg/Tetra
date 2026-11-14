export type GifsicleOutput = { name: string; file: Uint8Array<ArrayBuffer> };

let workerUrl: Promise<string> | undefined;

// The package bundles gifsicle's wasm inside a worker script and exposes it as a blob URL.
// Loaded on first use so pages that never process a GIF don't download ~340 KB.
const getWorkerUrl = () => {
  workerUrl ??= import("gifsicle-wasm-browser").then(({ default: gifsicle }) =>
    gifsicle.tool.worker()
  );
  return workerUrl;
};

// Runs gifsicle commands in a fresh worker; input is available as `input.gif`, every file
// written to `/out` is returned. We post to the worker ourselves instead of `gifsicle.run()`
// to drop its console logging and to support aborting: an aborted run terminates the worker
// immediately, so a newer edit never waits for a stale one.
export const runGifsicle = async (
  input: ArrayBuffer,
  commands: string[],
  signal?: AbortSignal
): Promise<GifsicleOutput[]> => {
  const url = await getWorkerUrl();
  signal?.throwIfAborted();

  return new Promise((resolve, reject) => {
    const worker = new Worker(url);

    const finish = () => {
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      finish();
      reject(signal?.reason);
    };

    signal?.addEventListener("abort", abort, { once: true });

    worker.onmessage = ({ data }: MessageEvent<GifsicleOutput[] | string | null>) => {
      finish();
      if (Array.isArray(data)) resolve(data);
      else
        reject(new Error(typeof data === "string" ? data : "Processing the GIF failed."));
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "Processing the GIF failed."));
    };

    const file = input.slice(0);
    worker.postMessage(
      {
        data: [{ file, name: "input.gif" }],
        command: commands,
        folder: [],
        // Strict mode fails the run on any stderr line, including harmless warnings like
        // "huge GIF, conserving memory" on big files. Real failures write no output file,
        // which callers already treat as an error.
        isStrict: false,
      },
      [file]
    );
  });
};
