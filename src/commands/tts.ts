import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { DiscordBot } from "../types";
import { getAllAudioBase64 } from "google-tts-api";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("tts")
    .setDescription("true tts")
    .addStringOption((option) =>
      option
        .setName("lang")
        .setDescription("language")
        .setRequired(true)
        .addChoices(
          { name: "Polish 👑", value: "pl" },
          { name: "Ukrainian 🐷", value: "uk" },
          { name: "Czech", value: "cs" },
          { name: "English", value: "en" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("tts")
        .setRequired(true)
        .setMaxLength(200)
        .setMinLength(2)
    ),
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    try {
      await interaction.reply("<a:PepegaLoad:1085673146939621428>");

      const lang = interaction.options.getString("lang");
      const text = interaction.options.getString("text");

      if (!lang || !text) return;

      const base = await getAllAudioBase64(text, {
        host: "https://translate.google.com",
        timeout: 10000,
        slow: false,
        lang,
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
      await interaction.editReply(`cos jeblo! ${String(error)}`);
    }
  },
};

export default importEmote;
