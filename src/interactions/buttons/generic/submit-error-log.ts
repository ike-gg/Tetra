import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  type TextChannel,
} from "discord.js";

import { Messages } from "@/constants/messages";
import { env } from "@/env";
import { TetraEmbed } from "@/utils/embed-messages/tetra-embed";

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
    const errorLogChannelId = env.ERROR_LOG_CHANNEL_ID;

    if (!errorLogChannelId) {
      CoreConsole.warn("ERROR_LOG_CHANNEL_ID is not set, cannot send the error log.");

      await interaction.reply({
        embeds: [TetraEmbed.error(Messages.ERROR_LOG_UNAVAILABLE)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

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
      const user = {
        username: interaction.user.username,
        avatarURL: interaction.user.avatarURL() ?? "",
        id: interaction.user.id,
      };

      const guild = {
        name: interaction.guild?.name ?? "unknown guild",
        id: interaction.guild?.id ?? "unknown id",
        memberCount: interaction.guild?.memberCount ?? 0,
        iconURL: interaction.guild?.iconURL?.() ?? "",
      };

      const originalInteractionId =
        interaction.message?.interaction?.id ?? "undefined initial interaction id";
      const originalInteractionCommandName =
        interaction.message?.interaction?.commandName ?? "undefined initial command name";
      const errorEmbedMessage = interaction.message?.embeds[0]?.toJSON?.() ?? null;

      await client.shard?.broadcastEval(
        async (
          client,
          {
            channelId,
            user,
            guild,
            originalInteractionId,
            originalInteractionCommandName,
            errorEmbedMessage,
          }
        ) => {
          const { EmbedBuilder } = await import("discord.js");

          const errorSnapshotsChannel = (await client.channels.fetch(
            channelId
          )) as TextChannel | null;

          if (!errorSnapshotsChannel) return;

          const embedData = {
            title: originalInteractionId,
            description: originalInteractionCommandName,
            author: {
              name: user.username,
              icon_url: user.avatarURL,
            },
            footer: {
              text: `${guild.name} - ${guild.id} (${guild.memberCount})`,
              icon_url: guild.iconURL,
            },
            timestamp: new Date().toISOString(),
          };

          const tetraEmbed = new EmbedBuilder()
            .setTitle(embedData.title)
            .setDescription(embedData.description)
            .setAuthor({
              name: embedData.author.name,
              iconURL: embedData.author.icon_url,
            })
            .setFooter({
              text: embedData.footer.text,
              iconURL: embedData.footer.icon_url,
            })
            .setTimestamp(new Date(embedData.timestamp));

          const embeds = errorEmbedMessage
            ? [tetraEmbed, EmbedBuilder.from(errorEmbedMessage)]
            : [tetraEmbed];

          await errorSnapshotsChannel.send({
            embeds,
          });
        },
        {
          context: {
            channelId: errorLogChannelId,
            user,
            guild,
            originalInteractionId,
            originalInteractionCommandName,
            errorEmbedMessage,
          },
        }
      );
    } catch (error) {
      CoreConsole.error("Error with logging an snapshot of error", error);
    }
  }
);

export default SubmitErrorLogGenericButton;
