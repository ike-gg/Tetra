import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { DiscordBot } from "../types";
import { getAllAudioBase64 } from "google-tts-api";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("tts")
    .setDescription("TTS mp3")
    .addStringOption((option) =>
      option.setName("lang").setDescription("language").setRequired(true).addChoices(
        {
          name: "Polish 👑",
          value: "pl",
        },
        {
          name: "Ukrainian 🐷",
          value: "uk",
        },
        {
          name: "Czech",
          value: "cs",
        },
        {
          name: "English",
          value: "en",
        }
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
    const feedback = await new FeedbackManager(interaction);
    try {
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

      await feedback.sendMessage({
        files: [mp3Attachment],
        content: "",
        embeds: [],
      });
    } catch (error) {
      await feedback.handleError(error);
    }
  },
};

export default importEmote;
