import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { ModalActionRowComponentBuilder } from "discord.js";

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
    console.log(interaction.memberPermissions);
    // const modal = new ModalBuilder().setCustomId("xd").setTitle("test");

    // const first = new TextInputBuilder()
    //   .setCustomId("XDD")
    //   .setLabel("co tam?")
    //   .setStyle(TextInputStyle.Short);

    // const second = new TextInputBuilder()
    //   .setCustomId("XDDDDD")
    //   .setLabel("minimajk")
    //   .setStyle(TextInputStyle.Paragraph);

    // const firstRow =
    //   new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
    //     first
    //   );
    // const thirdRow =
    //   new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
    //     second
    //   );

    // modal.addComponents(firstRow, thirdRow);

    // await interaction.showModal(modal);
  },
};

export default debug;
