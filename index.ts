import { discordBotToken } from "./config.json";
import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.GuildEmojisAndStickers],
});

client.once("ready", () => {
  console.log("ready!");
});

client.login(discordBotToken);
