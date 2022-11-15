import { ActionRowBuilder } from "@discordjs/builders";
import { Guild, SelectMenuBuilder } from "discord.js";

const getSelectMenuServers = async (taskId: string, guilds: Guild[]) => {
  const row = new ActionRowBuilder<SelectMenuBuilder>();
  const menu = new SelectMenuBuilder()
    .setCustomId(taskId)
    .setPlaceholder("Select server");

  guilds.forEach((guild) => {
    menu.addOptions({
      label: guild.name,
      value: guild.id,
    });
  });

  row.addComponents(menu);

  return row;
};

export default getSelectMenuServers;
