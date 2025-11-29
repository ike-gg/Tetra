import path from "path";

const resolveDir = (dir: string) => path.join(import.meta.dir, dir);

export const FILE_PATH = {
  // chat input commands
  GLOBAL_CHAT_INPUT_COMMANDS: resolveDir("../interactions/commands/global/chat-input"),
  INTERNAL_CHAT_INPUT_COMMANDS: resolveDir(
    "../interactions/commands/internal/chat-input"
  ),

  // context menu message commands
  GLOBAL_CONTEXT_MENU_MESSAGE_COMMANDS: resolveDir(
    "../interactions/commands/global/context-menu-message"
  ),

  // button interactions
  GENERIC_BUTTON_INTERACTIONS: resolveDir("../interactions/buttons/generic"),
  GLOBAL_BUTTON_INTERACTIONS: resolveDir("../interactions/buttons/global"),

  // select menu interactions
  SELECT_MENU_INTERACTIONS: resolveDir("../interactions/select-menu/global"),
};
