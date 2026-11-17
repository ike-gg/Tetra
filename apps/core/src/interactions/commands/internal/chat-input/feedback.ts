import { MessageFlags, SlashCommandBuilder } from "discord.js";

import { Messages } from "@/constants/messages";
import { env } from "@/env";
import { ChatInputCommandHandler } from "@/interactions";
import { feedbackPayload } from "@/utils/discord/feedback-payload";
import { createErrorCode, reportWithCode } from "@/utils/error-code";
import { FeedbackManager } from "@/utils/managers/feedback-manager";

const command = new SlashCommandBuilder()
  .setName("feedbackpreview")
  .setDescription("internal: preview every FeedbackManager reply type");

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Internal commands only load in development (registered as `internal-feedbackpreview` by
// deploy:dev); the guild check keeps it out of anything but DEV_GUILDS regardless
export default new ChatInputCommandHandler(command, async (interaction) => {
  if (!interaction.guildId || !env.DEV_GUILDS?.includes(interaction.guildId)) {
    await interaction.reply({
      content: "Only available in DEV_GUILDS.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Multi-step on the original reply: working → success, edited like the emote flow
  const feedback = new FeedbackManager(interaction);
  await feedback.working();

  const errorRows = FeedbackManager.errorRows();
  const samples: Parameters<typeof feedbackPayload>[] = [
    ["info", "downloading the slideshow images"],
    ["success", "added `catJAM`"],
    ["attention", "rename or resize the emote before adding it"],
    [
      "warning",
      Messages.REMAINING_EMOTE_SLOTS_WARNING({
        remainingSlots: 3,
        emoteType: "animated",
      }),
    ],
    ["warning", Messages.RATE_LIMIT_EXCEEDED],
    ["panel", Messages.TASK_IN_EDITOR, { rows: FeedbackManager.panelRows() }],
    ["media", Messages.NEW_MEDIA_COMMAND],
    ["premium", "premium perks are coming soon"],
    ["error", Messages.EMOTE_NOT_FOUND, { rows: errorRows }],
    ["error", Messages.BOT_MISSING_PERMISSIONS, { rows: errorRows }],
    ["error", Messages.INTERACTION_TIMEOUT, { rows: errorRows }],
    [
      "error",
      `something broke on my side. ${reportWithCode(createErrorCode())}`,
      { rows: errorRows },
    ],
  ];

  for (const [type, content, options] of samples) {
    await interaction.followUp(feedbackPayload(type, content, options));
  }

  await sleep(1500);
  await feedback.success("added `pepeHands`");
});
