import { CommandInteraction, TextChannel } from "discord.js";
import { DiscordBot } from "../types";
import { TetraEmbed } from "./embedMessages/TetraEmbed";
import { env, isDevelopment } from "../env";

const interactionLogger = async (interaction: CommandInteraction, client: DiscordBot) => {
  try {
    const { guild, user, id, commandName } = interaction;

    const options = interaction.options.data.map(({ name, value, options }) => {
      if (options) {
        return {
          [name]: options.map(({ name, value }) => ({
            [name]: value,
          })),
        };
      }
      return {
        [name]: value,
      };
    });

    if (isDevelopment) {
      console.log(`---------------------------------
${id} by ${user.username} ${user.id} in
guild: ${guild?.id} - ${guild?.name} - ${guild?.memberCount}
${commandName} - ${JSON.stringify(options)}`);
    }

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
          fields: [
            {
              name: "args",
              value: `\`\`\`json
${JSON.stringify(options)}\`\`\``,
            },
          ],
          footer: {
            text: `${guild?.name} - ${guild?.id} (${guild?.memberCount})`,
            iconURL: guild?.iconURL() ?? "",
          },
          timestamp: new Date(),
        }),
      ],
    });
  } catch (e) {
    console.error("Error occured while logging interaction.", e);
  }
};

export default interactionLogger;
