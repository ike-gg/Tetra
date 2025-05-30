import {
  Client,
  GatewayIntentBits,
  Events,
  Options,
  Collection,
  CommandInteraction,
  ButtonInteraction,
  SelectMenuInteraction,
} from "discord.js";

import DiscordOauth2 from "discord-oauth2";
import TaskManager from "./utils/managers/TaskManager";
import importInteractions from "./importInteractions";
import interactionHandler from "./interactionHandler";
import cron from "node-cron";
import { refreshUsersTokens } from "./utils/database/refreshUsersTokens";
import { env } from "./env";

export interface DiscordBot extends Client {
  commands: Collection<string, CommandInteraction>;
  buttonInteractions: Collection<string, ButtonInteraction>;
  selectMenu: Collection<string, SelectMenuInteraction>;
  tasks: TaskManager;
}

process.title = "tetra-bot";

if (env.node_env === "development") {
  console.log("---- Running in development mode ----");
} else if (env.node_env === "production") {
  console.log("---- RUNNING IN PRODUCTION ----");
}

// const PORT = env.PORT;

// const app = express();

// const limiter = rateLimit({
//   windowMs: 30000,
//   max: 20,
// });

// app.use(cookieParser());
// app.use(
//   cors({
//     credentials: true,
//     origin: [
//       "https://tetra.lol",
//       "http://localhost:3001",
//       "http://localhost:3000",
//       "https://www.tetra.lol",
//       "https://panel.tetra.lol",
//       "https://tetra.lol",
//     ],
//   })
// );
// app.use(limiter);
// app.use(
//   bodyParser.json({
//     limit: "10mb",
//   })
// );
// app.use("/", apiRouter);
// app.listen(PORT, () => {
//   console.log(`API running on port ${PORT}`);
// });

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
  console.info(`${client.user.username} connected. Bot ready.`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.inGuild() && interaction.isRepliable()) {
    interaction.reply("Not supported yet.");
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

const CRON_EVERY_3_HOURS = "0 */3 * * *";
cron.schedule(CRON_EVERY_3_HOURS, () => {
  refreshUsersTokens();
});

client.login(env.discordBotToken);

const discordOauth = new DiscordOauth2({
  clientId: env.oauthClientId,
  clientSecret: env.oauthClientSecret,
});

export { client, discordOauth };
