import { type APIEmbed, SlashCommandBuilder, type TextChannel } from "discord.js";

import { env } from "@/env";
import { ChatInputCommandHandler } from "@/interactions";
import { feedbackPayload } from "@/utils/discord/feedback-payload";
import { createErrorCode, logErrorCode, reportWithCode } from "@/utils/error-code";

const MAX_MESSAGE_LENGTH = 1000;

const command = new SlashCommandBuilder()
  .setName("feedback")
  .setDescription("send feedback about tetra")
  .addStringOption((option) =>
    option
      .setName("message")
      .setDescription("what you want to tell us")
      .setMaxLength(MAX_MESSAGE_LENGTH)
      .setRequired(true)
  );

export default new ChatInputCommandHandler(command, async (interaction, client) => {
  const message = interaction.options.getString("message", true);

  try {
    const channelId = env.FEEDBACK_CHANNEL_ID;
    if (!channelId) throw new Error("FEEDBACK_CHANNEL_ID is not set");

    const server = interaction.guildId
      ? `${interaction.guild?.name ?? "unknown server"} (${interaction.guildId})`
      : "DM";

    const embed: APIEmbed = {
      title: "feedback",
      description: message,
      author: {
        name: `${interaction.user.tag} (${interaction.user.id})`,
        icon_url: interaction.user.displayAvatarURL(),
      },
      footer: { text: server },
      timestamp: new Date().toISOString(),
    };

    // Same route as the error log: only the shard that has the channel's guild sends it
    const results = await client.shard!.broadcastEval(
      async (client, { channelId, embed }) => {
        const channel = (await client.channels
          .fetch(channelId)
          .catch(() => null)) as TextChannel | null;
        if (!channel) return false;

        await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
        return true;
      },
      { context: { channelId, embed } }
    );

    if (!results.includes(true)) {
      throw new Error(`feedback channel ${channelId} not found on any shard`);
    }

    await interaction.reply(
      feedbackPayload("success", "thanks, your feedback was sent", { ephemeral: true })
    );
  } catch (error) {
    const code = createErrorCode();
    logErrorCode(code, "Failed to send feedback", error);
    await interaction.reply(
      feedbackPayload("error", `something broke on my side. ${reportWithCode(code)}`, {
        ephemeral: true,
      })
    );
  }
});
