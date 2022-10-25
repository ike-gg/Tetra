import { CommandInteraction, SlashCommandBuilder } from "discord.js";

const ping = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Check if I am alive")
    .addIntegerOption((option) => option.setName("ile")),
  async execute(interaction: CommandInteraction) {
    const ile = interaction.options.get("ile");
    const channelId = interaction.channelId;
    if (interaction.isChatInputCommand()) {
      const channelId = interaction.channelId;
      interaction.client.channels.fetch(channelId).then((channel) => {
        // if (channel.type !== "text") {
        // }
      });
    }
    // interaction.channel!.fetch().then(channel => {
    //   if (channel.isTextBased()) {
    //     channel.
    //   }
    // })
  },
};

export default ping;
