import sharp from "sharp";
import { PlatformResult } from "../../commands/media";
import { tetraTempDirectory } from "../../constants";
import getTikTokVideo from "../getTikTokVideo";
import getBufferFromUrl from "../../emotes/source/getBufferFromUrl";
//@ts-ignore
import videoshow from "videoshow";
import * as fs from "fs";
import { FeedbackManager } from "../managers/FeedbackManager";
import fetch from "node-fetch";

export const handleTikTokMedia = async (
  _url: string,
  feedback: FeedbackManager
): Promise<PlatformResult> => {
  return new Promise(async (resolve, reject) => {
    try {
      const tempDirPath = tetraTempDirectory(feedback.interaction.id);

      const data = await getTikTokVideo(_url);

      if (data.slides.images.length > 1) {
        const imageSlides = data.slides.images;
        const audioURL = data.backsound.url;

        const imgPaths = await Promise.all(
          imageSlides.map(async (imageURL, index) => {
            const fileBuffer = await getBufferFromUrl(imageURL);
            const imageTransformedBuffer = await sharp(fileBuffer)
              .jpeg()
              .resize({ height: 960, width: 540, fit: "contain" })
              .toBuffer();
            const path = `${tempDirPath}/${index}.jpg`;
            fs.writeFileSync(path, imageTransformedBuffer);
            return path;
          })
        );

        if (audioURL) {
          const audioPath = `${tempDirPath}/audio.mp3`;
          const audioBuffer = await getBufferFromUrl(audioURL);
          fs.writeFileSync(audioPath, audioBuffer);
        }

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
          .on("start", (command: any) => {
            feedback.media({ title: "Rendering slide TikTok..." });
          })
          .on("error", (err: any, stdout: any, stderr: any) => {
            reject(new Error("Tiktok rendering failed."));
          })
          .on("end", async () => {
            const moviePath = `${tempDirPath}/final.mp4`;
            const movie = fs.readFileSync(moviePath);
            resolve({
              description: "",
              media: movie,
              data: { name: `tetra_${feedback.interaction.id}.mp4` },
            });
          });
      } else if (data.video.url.no_wm) {
        const source = await fetch(data.video.url.no_wm);
        const video = await source.buffer();
        resolve({
          description: "",
          media: video,
        });
      } else {
        reject(new Error("Tiktok not found."));
      }
    } catch (error) {
      reject(error);
    }
  });
};
