import { isDevelopment } from "../env";
import { TetraClient } from "../types";

import { InteractionsFileManager } from "#/files/interactions-file-manager";

export const importInteractions = async (client: TetraClient) => {
  client.chatInputCommands = await InteractionsFileManager.getChatInputCommands({
    withInternal: isDevelopment,
  });

  client.contextMenuMessageCommands =
    await InteractionsFileManager.getGlobalContextMenuMessageCommands();

  client.genericButtonInteractions =
    await InteractionsFileManager.getGenericButtonInteractions();

  client.globalButtonInteractions =
    await InteractionsFileManager.getGlobalButtonInteractions();

  // client.selectMenu = new Collection();
  // importSelectMenu(client.selectMenu);
};

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
