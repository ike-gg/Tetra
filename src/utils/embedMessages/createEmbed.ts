import errorEmbed from "./errorEmbed";
import infoEmbed from "./infoEmbed";
import successfulEmbed from "./successfulEmbed";
import warningEmbed from "./warningEmbed";
import emotePreviewEmbed from "./emotePreviewEmbed";
import {
  ButtonInteraction,
  CommandInteraction,
  BaseMessageOptions,
} from "discord.js";
import {
  ActionRowBuilder,
  EmbedBuilder,
  ButtonBuilder,
} from "@discordjs/builders";

export default {
  errorEmbed,
  infoEmbed,
  successfulEmbed,
  warningEmbed,
  emotePreviewEmbed,
};
