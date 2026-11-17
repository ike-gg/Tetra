/// <reference lib="webworker" />
import { createGifWriter, toGifDelay, toGifRepeat } from "./gif-writer";
import type { WebpJob, WebpReply } from "./webp-to-gif";

const reply = (message: WebpReply, transfer: Transferable[] = []) =>
  self.postMessage(message, { transfer });

// ImageDecoder hands out every frame already composited onto the full canvas (blending
// and disposal applied), so each one is written as a complete GIF frame
const convert = async ({ buffer, maxBytes }: WebpJob) => {
  if (
    typeof ImageDecoder === "undefined" ||
    !(await ImageDecoder.isTypeSupported("image/webp"))
  ) {
    return reply({ type: "error", kind: "unsupported" });
  }

  const decoder = new ImageDecoder({ data: buffer, type: "image/webp" });
  try {
    await decoder.tracks.ready;
    await decoder.completed;
    const track = decoder.tracks.selectedTrack;
    const total = track?.frameCount ?? 0;
    if (!track || total < 2) return reply({ type: "still" });

    let writer: ReturnType<typeof createGifWriter> | undefined;
    let context: OffscreenCanvasRenderingContext2D | null = null;
    let width = 0;
    let height = 0;

    for (let frameIndex = 0; frameIndex < total; frameIndex++) {
      const { image } = await decoder.decode({ frameIndex });
      if (!writer) {
        width = image.displayWidth;
        height = image.displayHeight;
        context = new OffscreenCanvas(width, height).getContext("2d", {
          willReadFrequently: true,
        });
        writer = createGifWriter(width, height, toGifRepeat(track.repetitionCount));
      }
      if (!context) throw new Error("this browser can't draw on a canvas");
      context.clearRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const delay = toGifDelay(image.duration);
      image.close();

      writer.addFrame(context.getImageData(0, 0, width, height).data, delay);
      if (writer.bytes > maxBytes) {
        return reply({ type: "error", kind: "too-big", bytes: writer.bytes });
      }
      reply({ type: "progress", done: frameIndex + 1, total });
    }

    const gif = writer?.finish();
    if (!gif) return reply({ type: "still" });
    reply({ type: "done", gif: gif.buffer as ArrayBuffer }, [gif.buffer]);
  } finally {
    decoder.close();
  }
};

self.onmessage = async ({ data }: MessageEvent<WebpJob>) => {
  try {
    await convert(data);
  } catch (error) {
    reply({
      type: "error",
      kind: "failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
