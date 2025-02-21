import DiscordOauth2 from "discord-oauth2";
import {
  Client,
  GatewayIntentBits,
  Events,
  Options,
  GuildMember,
  OAuth2Guild,
} from "discord.js";
import { eq } from "drizzle-orm";
import { remove } from "lodash";

import { initApi } from "./api";
import { db } from "./db";
import { emotes, EmoteOrigin, users, removedEmotes } from "./db/schema";
import { env, isProduction } from "./env";
import importInteractions from "./importInteractions";
import interactionHandler from "./interactionHandler";
import { DiscordBot } from "./types";
import TaskManager from "./utils/managers/TaskManager";

import { BotConsole, CoreConsole } from "#/loggers";

process.title = "tetra-bot";

if (isProduction) CoreConsole.warn("Running in production mode.");
else CoreConsole.info("Running in development mode.");

initApi();

const client = new Client({
  intents: [
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  makeCache: Options.cacheWithLimits(Options.DefaultMakeCacheSettings),
}) as DiscordBot;

importInteractions(client);

client.tasks = TaskManager.getInstance();

client.on(Events.ClientReady, async (client) => {
  BotConsole.success(`Logged in as ${client.user.username}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  const inGuild = interaction.inGuild();

  if (!inGuild) {
    return;
  }

  const isCommand = interaction.isCommand();
  const isButton = interaction.isButton();
  const isSelectMenu = interaction.isSelectMenu();
  const isAutocomplete = interaction.isAutocomplete();

  const supportedInteraction = isCommand || isButton || isSelectMenu || isAutocomplete;

  if (supportedInteraction) {
    try {
      interactionHandler(interaction, client);
    } catch (error) {
      console.error("Failed to handle interaction: ", error);
    }
  }
});

client.login(env.DISCORD_BOT_TOKEN);

// client.on(Events.GuildEmojiDelete, async (emote) => {
//   // check if the emote is already in the db.

//   console.log("existing emote ->", existingEmote);

//   BotConsole.dev.warn(
//     `Detected deleting emote ${emote.name} in ${emote.guild.name} guild. Keeping it in db.`
//   );

//   const [insertedEmote] = await db
//     .insert(emotes)
//     .values({
//       externalId: emote.id,
//       isAnimated: emote.animated ?? false,
//       name: emote.name ?? "Emote",
//       origin: EmoteOrigin.DISCORD,
//       previewUrl: emote.imageURL({
//         extension: emote.animated ? "gif" : "webp",
//         size: 64,
//       }),
//       url: emote.imageURL({
//         extension: emote.animated ? "gif" : "webp",
//       }),
//     })
//     .returning();

//   await db.insert(removedEmotes).values({
//     deletedWithPanel: false,
//     emoteId: insertedEmote.id,
//     guildId: emote.guild.id,
//   });
// });

const discordOauth = new DiscordOauth2({
  clientId: env.DISCORD_OAUTH_CLIENT_ID,
  clientSecret: env.DISCORD_OAUTH_CLIENT_SECRET,
  version: "v10",
});

export { client, discordOauth };
