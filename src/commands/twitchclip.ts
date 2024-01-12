import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  AutocompleteInteraction,
} from "discord.js";

import { DiscordBot } from "../types";
import { TwitchManager } from "../utils/managers/TwitchManager";
import { FeedbackManager } from "../utils/managers/FeedbackManager";

const importEmote = {
  data: new SlashCommandBuilder()
    .setName("twitchclip")
    .setDescription("get up to last 90s of stream")
    .addStringOption((option) =>
      option
        .setName("channel")
        .setDescription("twitch channel")
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async autocomplete(interaction: AutocompleteInteraction, client: DiscordBot) {
    const channelName = interaction.options.getString("channel");

    if (!channelName) return await interaction.respond([]);

    const channels = await TwitchManager.getLiveChannels(channelName);
    await interaction.respond(
      channels.map((stream) => {
        const { displayName, name, gameName } = stream;
        return {
          name: `${displayName} (playing ${gameName})`,
          value: name,
        };
      })
    );
  },
  async execute(interaction: ChatInputCommandInteraction, client: DiscordBot) {
    const feedback = new FeedbackManager(interaction);
    const channelName = interaction.options.getString("channel");

    if (!channelName) return;

    const twitch = new TwitchManager();

    await feedback.working();

    try {
      const user = await twitch.client.users.getUserByName(channelName);
      if (!user) throw "Not found userid.";
      const streamInfo = await twitch.client.streams.getStreamByUserId(user.id);
    } catch (error) {
      await feedback.handleError(error);
    }
  },
};

export default importEmote;

// df142a7eec57c5260d274b92abddb0bd1229dc538341434c90367cf1f22d71c4
// df142a7eec57c5260d274b92abddb0bd1229dc538341434c90367cf1f22d71c4
