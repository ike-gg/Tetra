import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  TextChannel,
} from "discord.js";

import { TetraClient } from "../types";
import { TetraEmbed } from "../utils/embedMessages/TetraEmbed";

const errorLog = {
  data: {
    name: "errorLog",
  },
  async execute(interaction: ButtonInteraction, client: TetraClient) {
    await interaction.update({
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`errorlogreceived`)
            .setEmoji({
              name: "📨",
            })
            .setLabel(`Log received!`)
            .setStyle(ButtonStyle.Danger)
            .setDisabled(true)
        ),
      ],
    });

    try {
      const errorSnapshotsChannel = (await client.channels.fetch(
        "1075586205070151710"
      )) as TextChannel;

      if (!errorSnapshotsChannel) return;

      const { user, guild } = interaction;
      const originalInteraction = interaction.message.interaction;
      const errorEmbedMessage = interaction.message.embeds[0];

      await errorSnapshotsChannel.send({
        embeds: [
          TetraEmbed.attention({
            title: originalInteraction?.id ?? "undefined initial interaction id",
            description:
              originalInteraction?.commandName ?? "undefined initial command name",
            author: {
              name: user.username,
              iconURL: user.avatarURL() ?? "",
            },
            footer: {
              text: `${guild?.name} - ${guild?.id} (${guild?.memberCount})`,
              iconURL: guild?.iconURL() ?? "",
            },
            timestamp: new Date(),
          }),
          errorEmbedMessage,
        ],
      });
    } catch (error) {
      console.error("error with logging an snapshot of error", error);
    }
  },
};

export default errorLog;
