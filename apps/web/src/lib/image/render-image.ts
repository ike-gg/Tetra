import { type Crop, type Edit, effectiveCrop, type OutputFormat } from "@/lib/media/edit";
import type { MediaFile } from "@/lib/media/media-file";

export type StillFormat = Exclude<OutputFormat, "auto">;

export type ImageJob = {
  buffer: ArrayBuffer;
  mime: string;
  crop: Crop | null;
  size: number;
  // Stretch to a square of `size` instead of keeping the shape
  fill: boolean;
  compression: number;
  trimEdges: boolean;
  format: OutputFormat;
  // What the output may be; "auto" picks among these (the panel leaves out JPEG)
  formats: readonly StillFormat[];
};

export type ImageJobResult = {
  file: ArrayBuffer;
  format: StillFormat;
  mime: string;
  width: number;
  height: number;
};

type WorkerReply = { ok: true; result: ImageJobResult } | { ok: false; error: string };

// Decoding, resizing and the wasm encoders (jSquash) run in a worker, one per run like the
// GIF path: an aborted run terminates its worker, so even a slow encode of a large photo
// never holds up the newer edit.
export const renderImage = (
  source: MediaFile,
  edit: Edit,
  formats: readonly StillFormat[],
  signal: AbortSignal
) =>
  new Promise<ImageJobResult>((resolve, reject) => {
    signal.throwIfAborted();
    const worker = new Worker(new URL("./image-worker.ts", import.meta.url), {
      type: "module",
    });

    const finish = () => {
      worker.terminate();
      signal.removeEventListener("abort", abort);
    };
    const abort = () => {
      finish();
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });

    worker.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
      finish();
      if (data.ok) resolve(data.result);
      else reject(new Error(data.error));
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "processing the image failed. try again"));
    };

    const job: ImageJob = {
      buffer: source.buffer.slice(0),
      mime: source.mime,
      crop: effectiveCrop(source.info, edit),
      size: edit.settings.size,
      fill: edit.settings.fitting === "fill",
      compression: edit.settings.compression,
      trimEdges: edit.settings.trimEdges,
      format: edit.settings.format,
      formats,
    };
    worker.postMessage(job, [job.buffer]);
  });
