import dotenv from "dotenv";
dotenv.config();

import {
  ActionRowBuilder,
  ButtonBuilder,
  CommandInteraction,
  EmbedBuilder,
  hyperlink,
  SlashCommandBuilder,
} from "discord.js";
import { DiscordBot } from "../types";
import URLButton from "../utils/buttons/URLButton";

const inviteLink = process.env.inviteLink as string;

const infobot = {
  data: new SlashCommandBuilder()
    .setName("infobot")
    .setDescription("Some information about bot."),
  async execute(interaction: CommandInteraction, client: DiscordBot) {
    const githubRepo = "https://github.com/ike-gg/Tetra";
    const githubAuthor = "https://github.com/ike-gg";
    const discordAuthor = "https://discordapp.com/users/224978978362884096/";
    const activeGuilds = client.guilds.cache.size;

    const dcInvLink = hyperlink("Click here!", inviteLink);
    const ghRepoLink = hyperlink("@ike-gg/Tetra", githubRepo);
    const ghAuthorLink = hyperlink("@ike-gg", githubAuthor);
    const dcAuthorLink = hyperlink("ike", discordAuthor);

    const componentsRow = new ActionRowBuilder<ButtonBuilder>();
    componentsRow.addComponents(
      URLButton("Invite link", inviteLink),
      URLButton("Discord Author", discordAuthor),
      URLButton("GitHub Repo", githubRepo),
      URLButton("GitHub Author", githubAuthor)
    );

    const messagePayload = new EmbedBuilder();
    messagePayload.setTitle("Bot informations");
    messagePayload.setFooter({
      text: client.user!.username,
      iconURL: client.user!.avatarURL()!,

      // url: inviteLink,
    });
    messagePayload.addFields({
      name: "Invite link",
      value: dcInvLink,
      inline: true,
    });
    messagePayload.addFields({
      name: "Active servers",
      value: activeGuilds.toString(),
      inline: true,
    });
    messagePayload.addFields({
      name: "Discord author",
      value: dcAuthorLink,
      inline: true,
    });
    messagePayload.addFields({
      name: "GitHub repository",
      value: ghRepoLink,
      inline: true,
    });
    messagePayload.addFields({
      name: "GitHub author",
      value: ghAuthorLink,
      inline: true,
    });
    messagePayload.setImage("https://i.imgur.com/vkJxLA2.png");
    messagePayload.setColor(0x000000);
    await interaction.reply({
      embeds: [messagePayload],
      components: [componentsRow],
    });
  },
};

export default infobot;
