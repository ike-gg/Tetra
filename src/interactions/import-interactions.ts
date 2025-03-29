import { ButtonInteraction, Collection, SelectMenuInteraction } from "discord.js";
import fs from "fs";
import path from "path";

import { isDevelopment } from "../env";
import { TetraClient } from "../types";

import { InteractionsFileManager } from "#/files/interactions-file-manager";

export const importInteractions = async (client: TetraClient) => {
  client.chatInputCommands = await InteractionsFileManager.getChatInputCommands({
    withInternal: isDevelopment,
  });

  client.contextMenuMessageCommands =
    await InteractionsFileManager.getGlobalContextMenuMessageCommands();

  // client.buttonInteractions = new Collection();
  // importButtonInteractions(client.buttonInteractions);

  // client.selectMenu = new Collection();
  // importSelectMenu(client.selectMenu);
};

// const importButtonInteractions = (
//   clientButtonInteractions: Collection<string, ButtonInteraction>
// ) => {
//   const buttonInteractionsPath = path.join(__dirname, "buttonInteractions");
//   const buttonInteractionsFiles = fs
//     .readdirSync(buttonInteractionsPath)
//     .filter((file) => file.endsWith(".ts"));

//   for (const file of buttonInteractionsFiles) {
//     const filePath = path.join(buttonInteractionsPath, file);
//     import(filePath).then((buttonInteraction) => {
//       clientButtonInteractions.set(
//         buttonInteraction.default.data.name,
//         buttonInteraction.default
//       );
//     });
//   }
// };

// const importSelectMenu = (clientCommands: Collection<string, SelectMenuInteraction>) => {
//   const selectMenuPath = path.join(__dirname, "selectMenu");
//   const selectMenuFiles = fs
//     .readdirSync(selectMenuPath)
//     .filter((file) => file.endsWith(".ts"));

//   for (const file of selectMenuFiles) {
//     const filePath = path.join(selectMenuPath, file);
//     import(filePath).then((selectMenuInteraction) => {
//       clientCommands.set(
//         selectMenuInteraction.default.data.name,
//         selectMenuInteraction.default
//       );
//     });
//   }
// };
