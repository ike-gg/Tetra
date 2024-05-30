import { ButtonBuilder, ButtonComponent, ButtonInteraction } from "discord.js";

import { DiscordBot } from "../types";
import { FeedbackManager } from "../utils/managers/FeedbackManager";
import { parseEntitlementsData } from "../utils/discord/parseEntitlementsData";
import getBufferFromUrl from "../emotes/source/getBufferFromUrl";
import { extractAudio } from "../utils/media/extractAudio";
import OpenAI, { toFile } from "openai";
import { env } from "../env";

const openai = new OpenAI({ apiKey: env.openai_auth_key });

const selectEmote = {
  data: { name: "describeMedia" },
  async execute(interaction: ButtonInteraction, client: DiscordBot) {
    const { hasPremium } = parseEntitlementsData(interaction);

    const feedback = new FeedbackManager(interaction);

    if (!hasPremium) {
      await interaction.sendPremiumRequired();
      return;
    }

    await feedback.working();

    const textContent = interaction.message.content;
    const firstButton =
      (interaction.message.components
        .at(0)
        ?.components.at(0) as ButtonComponent) || undefined;
    const link = firstButton?.url;

    const components = interaction.message.components.at(0)!;
    await interaction.editReply({ components: [components] });

    const messageWithMedia = interaction.message;
    const mediaUrls = messageWithMedia.attachments
      .filter((m) => m.contentType?.includes("mp4"))
      .map((m) => m.url)
      .at(0);

    if (!mediaUrls) {
      await feedback.error("No media found");
      return;
    }

    const videoBuffer = await getBufferFromUrl(mediaUrls);

    const audio = await extractAudio(videoBuffer, interaction.id);
    const audioFile = await toFile(audio, "audio.mp3");

    const { text: transcription } = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    const description = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You will receive a video transcription from the user. Briefly summarize the content of the video based on the provided transcription. For additional context:

          - User requested the video from the URL: ${link}
          - The description of the video is: ${textContent}
          
          Your response should be in the same language as the user transcription.
          Your response should be maximum 300 characters long.
            `,
        },
        {
          role: "user",
          content: transcription,
        },
      ],
      model: "gpt-4-turbo",
    });

    const response = description.choices.at(-1)?.message.content;

    await feedback.premium(response || "empty response ;(");
  },
};

export default selectEmote;
