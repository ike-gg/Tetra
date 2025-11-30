import { TConsole } from "./t-console";

class ApiConsole extends TConsole {
  get prefix(): string {
    return "API";
  }
}

class CoreConsole extends TConsole {
  get prefix(): string {
    return "CORE";
  }
}

class BotConsole extends TConsole {
  get prefix(): string {
    return "BOT";
  }
}

class DeployConsole extends TConsole {
  get prefix(): string {
    return "DEPLOY";
  }
}

export { ApiConsole, CoreConsole, BotConsole, DeployConsole };
