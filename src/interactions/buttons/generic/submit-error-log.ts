import { ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from "discord.js";

import { TetraEmbed } from "@/utils/embedMessages/TetraEmbed";

import { GenericButtonInteractionHandler } from "../..";

import { CoreConsole } from "#/loggers";

const BUTTON_INTERACTION_KEY = "submit-error-log";

const SubmitErrorLogGenericButton = new GenericButtonInteractionHandler(
  {
    name: BUTTON_INTERACTION_KEY,
    getButton: (data) =>
      new ButtonBuilder(data)
        .setCustomId(BUTTON_INTERACTION_KEY)
        .setEmoji({
          name: "📠",
        })
        .setLabel(`Send developers log`)
        .setStyle(ButtonStyle.Danger),
  },
  async (interaction, client) => {
    await interaction.update({
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`received`)
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
      CoreConsole.error("Error with logging an snapshot of error", error);
    }
  }
);

export default SubmitErrorLogGenericButton;
