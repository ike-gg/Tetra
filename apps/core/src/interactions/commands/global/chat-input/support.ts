import { type Client, MessageFlags, SlashCommandBuilder } from "discord.js";

import { ChatInputCommandHandler } from "@/interactions";

const command = new SlashCommandBuilder()
  .setName("help")
  .setDescription("get started with tetra");

const HELP_ENTRIES: [command: string, description: string][] = [
  ["addemote byname", "add an emote by name from 7TV, BTTV or FFZ"],
  ["addemote bylink", "add an emote from a 7TV, BTTV, FFZ or image link"],
  ["addemote bychannel", "browse a Twitch channel's 7TV emotes"],
  ["addemote subemotes", "browse a Twitch channel's sub emotes"],
  ["media", "download a video or images from a post or clip"],
  ["feedback", "send feedback about tetra"],
  ["invite", "add tetra to your server"],
  ["info", "stats, invite and source code"],
];

// Global command ids per shard; only successful fetches are kept, so a failure retries next time
let commandIds: Promise<Map<string, string>> | undefined;

const getCommandIds = (client: Client) => {
  commandIds ??= (async () => {
    const commands = await client.application!.commands.fetch();
    return new Map(commands.map((cmd) => [cmd.name, cmd.id]));
  })().catch((error) => {
    commandIds = undefined;
    throw error;
  });
  return commandIds;
};

// Clickable `</name sub:id>` when the global command is known (not with dev guild commands)
const formatCommand = (name: string, ids: Map<string, string>) => {
  const id = ids.get(name.split(" ")[0]);
  return id ? `</${name}:${id}>` : `\`/${name}\``;
};

export default new ChatInputCommandHandler(command, async (interaction, client) => {
  const ids = await getCommandIds(client).catch(() => new Map<string, string>());

  const lines = HELP_ENTRIES.map(
    ([name, description]) => `${formatCommand(name, ids)} ${description}`
  );

  await interaction.reply({
    content: [
      ...lines,
      "",
      "you can also right-click a message and open apps to add emotes from it",
    ].join("\n"),
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  });
});
