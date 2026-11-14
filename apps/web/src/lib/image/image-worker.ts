/// <reference lib="webworker" />
import { encode as encodeJpeg } from "@jsquash/jpeg";
import { optimise as optimisePng } from "@jsquash/oxipng";
import { encode as encodePng } from "@jsquash/png";
import resize from "@jsquash/resize";
import { encode as encodeWebp } from "@jsquash/webp";

import type { ImageJob, ImageJobResult, StillFormat } from "./render-image";

const MIME: Record<StillFormat, string> = {
  png: "image/png",
  webp: "image/webp",
  jpeg: "image/jpeg",
};

const cropTo = async ({ buffer, mime, crop }: ImageJob) => {
  const bitmap = await createImageBitmap(new Blob([buffer], { type: mime }));
  const area = crop ?? { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
  const width = Math.max(1, Math.round(area.width));
  const height = Math.max(1, Math.round(area.height));

  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas isn't available.");
  context.drawImage(
    bitmap,
    Math.round(area.x),
    Math.round(area.y),
    width,
    height,
    0,
    0,
    width,
    height
  );
  bitmap.close();

  return context.getImageData(0, 0, width, height);
};

const opaqueBounds = (image: ImageData) => {
  const { data, width, height } = image;
  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  return right < 0
    ? null
    : { left, top, width: right - left + 1, height: bottom - top + 1 };
};

const trimTransparent = (image: ImageData) => {
  const bounds = opaqueBounds(image);
  if (!bounds || (bounds.width === image.width && bounds.height === image.height)) {
    return image;
  }
  const trimmed = new ImageData(bounds.width, bounds.height);
  for (let y = 0; y < bounds.height; y++) {
    const from = ((bounds.top + y) * image.width + bounds.left) * 4;
    trimmed.data.set(
      image.data.subarray(from, from + bounds.width * 4),
      y * bounds.width * 4
    );
  }
  return trimmed;
};

const hasTransparency = ({ data }: ImageData) => {
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return true;
  return false;
};

// JPEG has no alpha; flatten onto white, which is what most viewers show anyway
const flatten = (image: ImageData) => {
  const flat = new ImageData(
    new Uint8ClampedArray(image.data),
    image.width,
    image.height
  );
  const { data } = flat;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    data[i] = data[i] * alpha + 255 * (1 - alpha);
    data[i + 1] = data[i + 1] * alpha + 255 * (1 - alpha);
    data[i + 2] = data[i + 2] * alpha + 255 * (1 - alpha);
    data[i + 3] = 255;
  }
  return flat;
};

// compression 0 = lossless (or as close as the format gets), 100 = quality 10
const quality = (compression: number) => Math.round(100 - compression * 0.9);

const encode = async (image: ImageData, format: StillFormat, compression: number) => {
  if (format === "png") return optimisePng(await encodePng(image), { level: 2 });
  if (format === "webp") {
    return encodeWebp(
      image,
      compression === 0 ? { lossless: 1, quality: 75 } : { quality: quality(compression) }
    );
  }
  return encodeJpeg(flatten(image), {
    quality: compression === 0 ? 95 : quality(compression),
  });
};

// "auto" only compares formats that keep what the slider promises: lossless ones at 0,
// lossy ones above, and JPEG only when there's nothing transparent to lose
const candidates = (image: ImageData, compression: number): StillFormat[] => {
  if (compression === 0) return ["png", "webp"];
  return hasTransparency(image) ? ["webp"] : ["webp", "jpeg"];
};

const run = async (job: ImageJob): Promise<ImageJobResult> => {
  let image = await cropTo(job);
  if (job.trimEdges) image = trimTransparent(image);

  const longest = Math.max(image.width, image.height);
  const scale = Math.min(1, job.size / longest);
  const side = Math.max(1, Math.round(longest * scale));
  const target = job.fill
    ? { width: side, height: side }
    : {
        width: Math.max(1, Math.round(image.width * scale)),
        height: Math.max(1, Math.round(image.height * scale)),
      };
  if (target.width !== image.width || target.height !== image.height) {
    image = await resize(image, {
      ...target,
      method: "lanczos3",
      premultiply: true,
      linearRGB: true,
      fitMethod: "stretch",
    });
  }

  const allowed = (format: StillFormat) => job.formats.includes(format);
  const formats =
    job.format !== "auto" && allowed(job.format)
      ? [job.format]
      : candidates(image, job.compression).filter(allowed);
  let best: { file: ArrayBuffer; format: StillFormat } | null = null;
  for (const format of formats) {
    const file = await encode(image, format, job.compression);
    if (!best || file.byteLength < best.file.byteLength) best = { file, format };
  }
  if (!best) throw new Error("Nothing to encode.");

  return {
    file: best.file,
    format: best.format,
    mime: MIME[best.format],
    width: image.width,
    height: image.height,
  };
};

self.onmessage = async ({ data }: MessageEvent<ImageJob>) => {
  try {
    const result = await run(data);
    self.postMessage({ ok: true, result }, { transfer: [result.file] });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : "Processing the image failed.",
    });
  }
};
