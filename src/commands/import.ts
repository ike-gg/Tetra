import {
  CommandInteraction,
  Interaction,
  SlashCommandBuilder,
} from "discord.js";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("import")
    .setDescription("Import emote from 7TV to this server")
    .addStringOption((option) =>
      option
        .setName("link")
        .setDescription("Insert link or ID to emote.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription(
          "Type here name for emote, leave filed blank and emote will keep its name"
        )
        .setRequired(false)
    ),
  async execute(interaction: CommandInteraction): Promise<void> {
    if (!interaction.memberPermissions!.has("ManageEmojisAndStickers")) {
      interaction.reply({
        ephemeral: true,
        content:
          "Ooops! It look's like you dont have permissions to manage emojis and stickers on this server!",
      });
      return;
    }

    console.log(interaction.options.get("link"));
  },
};

export default importEmote;
