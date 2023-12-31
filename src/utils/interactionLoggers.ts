import { CommandInteraction, Interaction, TextChannel } from "discord.js";
import { client } from "..";
import { DiscordBot } from "../types";
import { TetraEmbed } from "./embedMessages/TetraEmbed";

const interactionLogger = async (
  interaction: CommandInteraction,
  client: DiscordBot
) => {
  const { guild, user, id, commandName } = interaction;
  const options = interaction.options.data.map(({ name, value }) => ({
    [name]: value,
  }));
  console.assert({
    id,
    guildId: guild?.id,
    guildName: guild?.name,
    guildMembers: guild?.memberCount,
    commandName,
    options,
  });

  const announceChannel = (await client.channels.fetch(
    "1074256923119063123"
  )) as TextChannel;

  if (!announceChannel) return;

  announceChannel.send({
    embeds: [
      TetraEmbed.info({
        title: id,
        description: `${commandName}`,
        author: {
          name: user.username,
          iconURL: user.avatarURL() ?? "",
        },
        fields: interaction.options.data.map(({ name, value }) => ({
          name,
          value: String(value),
        })),
        footer: {
          text: `${guild?.name} - ${guild?.id} (${guild?.memberCount})`,
          iconURL: guild?.iconURL() ?? "",
        },
        timestamp: new Date(),
      }),
    ],
  });
};

export const manualLogger = async (text: string) => {
  try {
    const announceChannel = (await client.channels.fetch(
      "1074256923119063123"
    )) as TextChannel;

    if (!announceChannel) return;

    announceChannel.send(text);
  } catch (e) {
    console.error(e);
  }
};

export default interactionLogger;
