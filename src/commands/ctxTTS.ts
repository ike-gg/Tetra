import {
  ApplicationCommandType,
  AttachmentBuilder,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
} from "discord.js";

import { DiscordBot, Emote } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import getTenorGif from "../emotes/source/file/getTenorGif";
import isValidURL from "../utils/isValidURL";
import prepareEmote from "../emotes/prepareEmote";
import getImgurFile from "../emotes/source/file/getImgurFile";
import getSourceFile from "../emotes/source/file/getSourceFile";
import getGiphyGif from "../emotes/source/file/getGiphyGif";
import { getAllAudioBase64 } from "google-tts-api";

const ctxStealReaction = {
  data: new ContextMenuCommandBuilder()
    .setName("TTS")
    .setType(ApplicationCommandType.Message),
  async execute(
    interaction: MessageContextMenuCommandInteraction,
    client: DiscordBot
  ) {
    try {
      await interaction.reply("<a:PepegaLoad:1085673146939621428>");

      const text = interaction.targetMessage.content;

      const base = await getAllAudioBase64(text, {
        host: "https://translate.google.com",
        timeout: 10000,
        slow: false,
        lang: "pl",
        splitPunct: ",.?!",
      });

      const mp3Base64 = base[0].base64;
      const mp3Buffer = Buffer.from(mp3Base64, "base64");

      const mp3Attachment = new AttachmentBuilder(mp3Buffer);

      const username = interaction.user.username;
      const interactionId = interaction.id;

      mp3Attachment.setName(`${username}${interactionId}.mp3`);

      await interaction.editReply({
        files: [mp3Attachment],
        content: "",
      });
    } catch (error) {
      await interaction.editReply(
        `nie nwikam anwte co sie tsalo ${String(error)}`
      );
    }
  },
};

export default ctxStealReaction;
