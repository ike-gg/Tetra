import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import fetch from "node-fetch";
import { DiscordBot } from "../types";
import getTikTokVideo from "../utils/getTikTokVideo";
import * as fs from "fs";
//@ts-ignore
import videoshow from "videoshow";
import getBufferFromUrl from "../emotes/source/getBufferFromUrl";
import { cwd } from "process";
import { tmpdir } from "os";
import { tetraTempDirectory } from "../constants";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription("tiktacz")
    .addStringOption((option) =>
      option.setName("url").setDescription("tiktok url").setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    try {
      await interaction.reply("<a:PepegaLoad:1085673146939621428>");
      const urlVideo = interaction.options.getString("url");

      const tempDirPath = tetraTempDirectory(interaction.id);

      if (!urlVideo) return;

      const data = await getTikTokVideo(urlVideo);

      console.log(data);

      if (data.slides.images.length > 1) {
        const imageSlides = data.slides.images;
        const audioURL = data.backsound.url;

        const imgPaths = await Promise.all(
          imageSlides.map(async (imageURL, index) => {
            const fileBuffer = await getBufferFromUrl(imageURL);
            const path = `${tempDirPath}/${index}.jpg`;
            fs.writeFileSync(path, fileBuffer);
            return path;
          })
        );

        if (audioURL) {
          const audioPath = `${tempDirPath}/audio.mp3`;
          const audioBuffer = await getBufferFromUrl(audioURL);
          fs.writeFileSync(audioPath, audioBuffer);
        }

        console.log(tempDirPath);
        videoshow(imgPaths, {
          fps: 25,
          loop: 5, // seconds
          transition: true,
          transitionDuration: 1, // seconds
          videoBitrate: 1024,
          videoCodec: "libx264",
          size: "640x?",
          audioBitrate: "128k",
          audioChannels: 2,
          format: "mp4",
          pixelFormat: "yuv420p",
        })
          .audio(`${tempDirPath}/audio.mp3`)
          .save(`${tempDirPath}/final.mp4`)
          .on("start", function (command: any) {
            console.log("ffmpeg process started:", command);
          })
          .on("error", async function (err: any, stdout: any, stderr: any) {
            await interaction.editReply("jeblo cos xd");
          })
          .on("end", async function () {
            const moviePath = `${tempDirPath}/final.mp4`;

            const movie = fs.readFileSync(moviePath);

            const videoAttachment = new AttachmentBuilder(movie);
            videoAttachment.setName("video.mp4");
            await interaction.editReply({
              files: [videoAttachment],
              content: "",
            });
          });

        return;
      }

      if (!data.video.url.no_wm) {
        await interaction.editReply("Source URL not found.");
        return;
      }

      const source = await fetch(data.video.url.no_wm);
      const video = await source.buffer();

      const videoAttachment = new AttachmentBuilder(video);
      videoAttachment.setName("video.mp4");
      await interaction.editReply({
        files: [videoAttachment],
        content: "",
      });
    } catch (error) {
      await interaction.editReply(`cos jeblo! ${String(error)}`);
    }
  },
};

export default importEmote;
