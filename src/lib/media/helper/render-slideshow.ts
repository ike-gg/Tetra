import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
//@ts-expect-error - videoshow is not typed
import videoshow from "videoshow";

import { EmbeddedError } from "../../../constants/errors";

import { TempFileManager } from "#/files/temp-file-manager";

export const renderSlideshow = async (
  images: Buffer[],
  audio?: Buffer
): Promise<Buffer> => {
  const tempDirPath = TempFileManager.create();

  const imgPaths = await Promise.all(
    images.map(async (image, index) => {
      const imageTransformedBuffer = await sharp(image)
        .jpeg()
        .resize({
          height: 960,
          width: 540,
          fit: "contain",
        })
        .toBuffer();
      const path = `${tempDirPath}/${index}.jpeg`;
      fs.writeFileSync(path, imageTransformedBuffer);
      return path;
    })
  );

  const audioPath = `${tempDirPath}/audio.mp3`;

  if (audio) {
    fs.writeFileSync(audioPath, audio);
  }

  if (!audio) {
    const blankAudioPath = path.resolve(__dirname, "./blank.mp3");
    const blankAudio = fs.readFileSync(blankAudioPath);
    fs.writeFileSync(audioPath, blankAudio);
  }

  return new Promise((resolve, reject) => {
    videoshow(imgPaths, {
      fps: 15,
      loop: 3,
      videoBitrate: 512,
      transition: false,
      transitionDuration: 0.2, // seconds
      videoCodec: "libx264",
      size: "540x960",
      audioBitrate: "64k",
      audioChannels: 1,
      format: "mp4",
      pixelFormat: "yuv420p",
    })
      .audio(`${tempDirPath}/audio.mp3`)
      .save(`${tempDirPath}/final.mp4`)
      .on("error", (err: Error, _stdout: string, stderr: string) => {
        console.log(err, stderr);
        reject(new EmbeddedError("Error occurred while rendering slideshow"));
      })
      .on("end", () => {
        const moviePath = `${tempDirPath}/final.mp4`;
        const movie = fs.readFileSync(moviePath);

        resolve(movie);
      });
  });
};
