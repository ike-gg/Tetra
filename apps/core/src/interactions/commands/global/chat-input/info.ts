import {
  ActionRowBuilder,
  type ButtonBuilder,
  EmbedBuilder,
  formatEmoji,
  hyperlink,
  SlashCommandBuilder,
} from "discord.js";

import { APP } from "@/constants";
import { APP_EMOTES } from "@/constants/app-emotes";
import { ChatInputCommandHandler } from "@/interactions";
import { URLButton } from "@/utils/discord/components/url-button";

const command = new SlashCommandBuilder()
  .setName("info")
  .setDescription("info about tetra");

export default new ChatInputCommandHandler(command, async (interaction, client) => {
  const guildsCount = (
    (await client.shard!.fetchClientValues("guilds.cache.size")) as number[]
  ).reduce((a: number, b: number) => a + b, 0);

  const componentsRow = new ActionRowBuilder<ButtonBuilder>();

  componentsRow.addComponents(
    URLButton("invite", APP.INVITE_LINK),
    URLButton("owner", APP.DISCORD_OWNER).setEmoji(APP_EMOTES.LOGO_DISCORD),
    URLButton("source code", APP.GITHUB_REPO).setEmoji(APP_EMOTES.LOGO_GITHUB)
  );

  const messagePayload = new EmbedBuilder();

  messagePayload.addFields({
    name: "add tetra to your server",
    value: hyperlink("invite tetra", APP.INVITE_LINK),
    inline: true,
  });
  messagePayload.addFields({
    name: "servers",
    value: guildsCount.toString(),
    inline: true,
  });
  messagePayload.addFields({
    name: "users",
    // todo fetch count from all shards
    // value: usersCount.toString(),
    value: "-",
    inline: true,
  });
  messagePayload.addFields({
    name: `${formatEmoji(APP_EMOTES.LOGO_DISCORD)} owner`,
    value: hyperlink("open profile", APP.DISCORD_OWNER),
    inline: true,
  });
  messagePayload.addFields({
    name: `${formatEmoji(APP_EMOTES.LOGO_GITHUB)} source code`,
    value: hyperlink("@ike-gg/Tetra", APP.GITHUB_REPO),
    inline: true,
  });

  messagePayload.setImage("https://i.imgur.com/dFft3ZU.png");
  messagePayload.setColor(APP.PRIMARY_COLOR);
  await interaction.reply({
    embeds: [messagePayload],
    components: [componentsRow],
  });
});
