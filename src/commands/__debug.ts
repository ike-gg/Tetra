import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";

const debug = {
  data: new SlashCommandBuilder()
    .setName("debug")
    .setDescription("dev purposes")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("userid")
        .setDescription("get user id")
        .addUserOption((option) =>
          option.setName("target").setDescription("select user")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("guildid")
        .setDescription("get guild id")
        .addUserOption((option) =>
          option.setName("guild").setDescription("select guild")
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    interaction.options.getSubcommand;
  },
};

export default debug;
