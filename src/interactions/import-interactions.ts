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

  client.globalSelectMenuInteractions =
    await InteractionsFileManager.getGlobalSelectMenuInteractions();
};
