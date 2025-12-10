import { ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel } from "discord.js";

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
      const user = {
        username: interaction.user?.username ?? "unknown user",
        avatarURL: interaction.user?.avatarURL?.() ?? "",
        id: interaction.user?.id ?? "unknown id",
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
            user,
            guild,
            originalInteractionId,
            originalInteractionCommandName,
            errorEmbedMessage,
          }
        ) => {
          const { EmbedBuilder } = await import("discord.js");

          const errorSnapshotsChannel = (await client.channels.fetch(
            "1075586205070151710"
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

    // try {
    //   const errorSnapshotsChannel = (await client.channels.fetch(
    //     "1075586205070151710"
    //   )) as TextChannel;

    //   if (!errorSnapshotsChannel) return;

    //   const { user, guild } = interaction;
    //   const originalInteraction = interaction.message.interaction;
    //   const errorEmbedMessage = interaction.message.embeds[0];

    //   await errorSnapshotsChannel.send({
    //     embeds: [
    //       TetraEmbed.attention({
    //         title: originalInteraction?.id ?? "undefined initial interaction id",
    //         description:
    //           originalInteraction?.commandName ?? "undefined initial command name",
    //         author: {
    //           name: user.username,
    //           iconURL: user.avatarURL() ?? "",
    //         },
    //         footer: {
    //           text: `${guild?.name} - ${guild?.id} (${guild?.memberCount})`,
    //           iconURL: guild?.iconURL() ?? "",
    //         },
    //         timestamp: new Date(),
    //       }),
    //       errorEmbedMessage,
    //     ],
    //   });
    // } catch (error) {
    //   CoreConsole.error("Error with logging an snapshot of error", error);
    // }
  }
);

export default SubmitErrorLogGenericButton;
