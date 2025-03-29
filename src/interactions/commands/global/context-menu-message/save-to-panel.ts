import { ApplicationCommandType, ContextMenuCommandBuilder } from "discord.js";

import { Messages } from "@/constants/messages";
import { ContextMenuMessageCommandHandler } from "@/interactions";
import findEmotesInMessage from "@/utils/discord/findEmotesInMessage";
import { FeedbackManager } from "@/utils/managers/FeedbackManager";

const command = new ContextMenuCommandBuilder()
  .setName("Save to Panel")
  .setType(ApplicationCommandType.Message);

export default new ContextMenuMessageCommandHandler(command, async (interaction) => {
  const feedback = new FeedbackManager(interaction, {
    ephemeral: true,
  });

  const messageContent = interaction.targetMessage.content;
  const { username } = interaction.targetMessage.author;
  const emotes = findEmotesInMessage(messageContent, username);

  if (emotes.length === 0) {
    await feedback.error(Messages.EMOTE_NOT_FOUND);
    return;
  }

  // const savedEmoteExpireTime = 1000 * 60 * 60 * 24 * 7;
  // const currentTime = new Date();

  await feedback.panel("TODO");

  // try {
  //   const prisma = new PrismaClient();
  //   await prisma.emotes.createMany({
  //     data: emotes.map((emote) => ({
  //       accountId: interaction.user.id,
  //       emoteName: emote.name,
  //       emoteUrl: emote.file.url,
  //       expiresOn: new Date(currentTime.getTime() + savedEmoteExpireTime),
  //       origin: "DISCORD",
  //       reference: emote.id,
  //       animated: emote.animated,
  //     })),
  //   });
  //   await prisma.$disconnect();
  //   await feedback.panel("Emote(s) saved to Panel.");
  // } catch (error) {
  //   await feedback.error("Saving emote to panel failed.");
  // }
});
