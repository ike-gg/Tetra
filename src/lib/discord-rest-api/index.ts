import { API } from "@discordjs/core";
import { REST } from "discord.js";

import { env } from "@/env";

export const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);

export const discordRestApi = new API(rest);
