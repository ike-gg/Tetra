import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { DiscordBot } from "../types";
import getBufferFromUrl from "../emotes/source/getBufferFromUrl";
//@ts-ignore
import instagramDl from "@sasmeee/igdl";
import { z } from "zod";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { Messages } from "../constants/messages";

const instagramPiece = z.object({
  download_link: z.string().url(),
  thumbnail_link: z.string().optional(),
});

const instagramReelSchema = z.array(instagramPiece);

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("instagram")
    .setDescription("(only reels supported)")
    .addStringOption((option) =>
      option.setName("url").setDescription("url").setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    await new FeedbackManager(interaction).warning(Messages.NEW_MEDIA_COMMAND);
    // try {
    //   await interaction.reply("<a:PepegaLoad:1085673146939621428>");
    //   const urlVideo = interaction.options.getString("url");

    //   if (!urlVideo) return;

    //   const reelsDetails = (await instagramDl(urlVideo)) as any[];

    //   if (reelsDetails.length === 0) {
    //     await interaction.editReply("empty payload, reels not found");
    //     return;
    //   }

    //   console.log(reelsDetails);

    //   const reelsData = instagramReelSchema.safeParse(reelsDetails);

    //   if (!reelsData.success) {
    //     await interaction.editReply("invalid url/unauthorized/invalid schema");
    //     return;
    //   }

    //   await interaction.editReply({
    //     files: reelsData.data.map(
    //       (element) =>
    //         new AttachmentBuilder(element.download_link, { name: "GOWNO.mp4" })
    //     ),
    //     content: ``,
    //   });
    // } catch (error) {
    //   await interaction.editReply(`cos jeblo! ${String(error)}`);
    // }
  },
};

export default importEmote;
