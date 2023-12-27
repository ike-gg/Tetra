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
import { tetraTempDirectory } from "../constants";
import sharp from "sharp";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { Messages } from "../constants/messages";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription("tiktacz")
    .addStringOption((option) =>
      option.setName("url").setDescription("tiktok url").setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("time")
        .setDescription(
          "set time for each slide in seconds, default 3, not required"
        )
        .setRequired(false)
        .setMaxValue(15)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    await new FeedbackManager(interaction).warning(Messages.NEW_MEDIA_COMMAND);
    // try {
    //   await interaction.reply("<a:PepegaLoad:1085673146939621428>");
    //   const urlVideo = interaction.options.getString("url");
    //   const loopValue = interaction.options.getInteger("time") || 3;

    //   const tempDirPath = tetraTempDirectory(interaction.id);

    //   if (!urlVideo) return;

    //   const data = await getTikTokVideo(urlVideo);

    //   if (data.slides.images.length > 1) {
    //     const imageSlides = data.slides.images;
    //     const audioURL = data.backsound.url;

    //     const imgPaths = await Promise.all(
    //       imageSlides.map(async (imageURL, index) => {
    //         const fileBuffer = await getBufferFromUrl(imageURL);
    //         const imageTransformedBuffer = await sharp(fileBuffer)
    //           .jpeg()
    //           .resize({ height: 960, width: 540, fit: "contain" })
    //           .toBuffer();
    //         const path = `${tempDirPath}/${index}.jpg`;
    //         fs.writeFileSync(path, imageTransformedBuffer);
    //         return path;
    //       })
    //     );

    //     if (audioURL) {
    //       const audioPath = `${tempDirPath}/audio.mp3`;
    //       const audioBuffer = await getBufferFromUrl(audioURL);
    //       fs.writeFileSync(audioPath, audioBuffer);
    //     }

    //     videoshow(imgPaths, {
    //       fps: 15,
    //       loop: loopValue,
    //       videoBitrate: 512,
    //       transition: false,
    //       transitionDuration: 0.2, // seconds
    //       videoCodec: "libx264",
    //       size: "540x960",
    //       audioBitrate: "64k",
    //       audioChannels: 1,
    //       format: "mp4",
    //       pixelFormat: "yuv420p",
    //     })
    //       .audio(`${tempDirPath}/audio.mp3`)
    //       .save(`${tempDirPath}/final.mp4`)
    //       .on("start", async function (command: any) {
    //         await interaction.editReply(
    //           "<a:jasperDance:1126152484340121620> rendering slideshow"
    //         );
    //         console.log("ffmpeg process started:", command);
    //       })
    //       .on("error", async function (err: any, stdout: any, stderr: any) {
    //         console.log(err, stdout, stderr);
    //         await interaction.editReply(
    //           "<a:beka:1091924091495260222> jeblo cos xd"
    //         );
    //       })
    //       .on("end", async function () {
    //         const moviePath = `${tempDirPath}/final.mp4`;

    //         const movie = fs.readFileSync(moviePath);

    //         const videoAttachment = new AttachmentBuilder(movie);
    //         videoAttachment.setName("video.mp4");
    //         await interaction.editReply({
    //           files: [videoAttachment],
    //           content: "",
    //         });
    //       });

    //     return;
    //   }

    //   if (!data.video.url.no_wm) {
    //     await interaction.editReply("Source URL not found.");
    //     return;
    //   }

    //   const source = await fetch(data.video.url.no_wm);
    //   const video = await source.buffer();

    //   const videoAttachment = new AttachmentBuilder(video);
    //   videoAttachment.setName("video.mp4");
    //   await interaction.editReply({
    //     files: [videoAttachment],
    //     content: "",
    //   });
    // } catch (error) {
    //   await interaction.editReply(`cos jeblo! ${String(error)}`);
    // }
  },
};

export default importEmote;
