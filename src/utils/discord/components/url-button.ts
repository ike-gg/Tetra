import { ButtonBuilder } from "@discordjs/builders";
import { ButtonStyle } from "discord.js";

export const URLButton = (label: string, url: string) => {
  return new ButtonBuilder().setURL(url).setStyle(ButtonStyle.Link).setLabel(label);
};
