import { bundle } from "@remotion/bundler";
//UNINSTALL BUNDLE.
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
//@ts-ignore
import ffprobe from "ffprobe-client";

interface WatermarkVideoProps {
  mediaUrl: string;
  durationInFrames: number;
  width: number;
  height: number;
}

const compositionId = "tetramedia";

export const watermarkVideo = async (url: string) => {
  console.log("begin watermarking...");
  // const bundleLocation = await bundle({
  //   entryPoint: path.resolve("./watermark/bundle.js")
  // })

  console.log("ffprobe start");
  const { format } = await ffprobe(url);
  console.log("ffprobe end");

  const { duration } = format;

  const bundleLocation = path.resolve(__dirname, "./watermark");

  console.log(bundleLocation);

  const inputProps = {
    mediaUrl: url,
    durationInFrames: Math.ceil(duration * 30),
  };

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  });

  const { buffer } = await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: "h264",
    inputProps,
  });

  return buffer;
};
