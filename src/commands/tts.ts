import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import { DiscordBot } from "../types";
import { getAllAudioBase64 } from "google-tts-api";
import { OpenAI } from "openai";
import { env } from "../env";
import { parseEntitlementsData } from "../utils/discord/parseEntitlementsData";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

const openai = new OpenAI({ apiKey: env.openai_auth_key });

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("tts")
    .setDescription("TTS mp3")
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
    const { hasPremium } = parseEntitlementsData(interaction);
    const feedback = await new FeedbackManager(interaction);
    try {
      const lang = interaction.options.getString("lang");
      const text = interaction.options.getString("text");

      if (!lang || !text) return;

      if (hasPremium) {
        await feedback.premium("Processing...");

        const ai = await openai.audio.speech.create({
          input: text,
          model: "tts-1-hd",
          voice: "nova",
          response_format: "mp3",
        });
        const arrayBuffer = await ai.arrayBuffer();

        const buffer = Buffer.from(arrayBuffer);

        await feedback.sendMessage({
          files: [
            new AttachmentBuilder(buffer, {
              name: `${interaction.user.username}${interaction.id}.mp3`,
            }),
          ],
          content: "",
          embeds: [],
        });

        return;
      }
      await feedback.working();

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
