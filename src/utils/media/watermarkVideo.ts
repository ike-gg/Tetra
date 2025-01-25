import ffmpeg from "ffmpeg";
import * as fs from "fs";
import { tetraTempDirectory } from "../../constants";
import path from "path";
import { randomUUID } from "crypto";

export const watermarkVideo = async (video: Buffer, id: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const pid = randomUUID();
    const tempDir = tetraTempDirectory(id);
    const videoPath = `${tempDir}/in${pid}.mp4`;
    const newVideoPath = `${tempDir}/out${pid}.mp4`;

    const watermarkPath = path.resolve(__dirname, "./watermark.png");

    fs.writeFileSync(videoPath, video);

    try {
      new ffmpeg(videoPath, (err, video) => {
        if (!err) {
          video.fnAddWatermark(
            watermarkPath,
            newVideoPath,
            {
              position: "C",
            },
            (error, file) => {
              if (!error) {
                const outputBuffer = fs.readFileSync(file);
                resolve(outputBuffer);
              } else {
                console.log(error);
                reject(new Error("Failed to watermark video"));
              }
            }
          );
        } else {
          reject(new Error("Failed to read video?"));
        }
      });
    } catch (error) {
      reject(new Error("FFMPEG failed."));
    }
  });
};

// remotion approach but it renders really slow.

// import { renderMedia, selectComposition } from "@remotion/renderer";
// import path from "path";
// //@ts-ignore
// import ffprobe from "ffprobe-client";

// interface WatermarkVideoProps {
//   mediaUrl?: string;
//   durationInFrames?: number;
//   width?: number;
//   height?: number;
// }

// const compositionId = "tetramedia";
// export const watermarkVideo = async (url: string) => {
// const { format } = await ffprobe(url);

//   const { duration } = format;

//   const bundleLocation = path.resolve(__dirname, "./watermark");

//   const inputProps: WatermarkVideoProps = {
//     mediaUrl: url,
//     durationInFrames: Math.ceil(duration * 30),
//   };

//   const composition = await selectComposition({
//     serveUrl: bundleLocation,
//     id: compositionId,
//     //@ts-ignore
//     inputProps,
//   });

//   const { buffer } = await renderMedia({
//     composition,
//     serveUrl: bundleLocation,
//     codec: "h264",
//     //@ts-ignore
//     inputProps,
//     onProgress: (p) => console.log(p),
//   });

//   return buffer;
// };
