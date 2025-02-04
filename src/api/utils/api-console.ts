import { TConsole } from "../../services/Console";

export class ApiConsole extends TConsole {
  get prefix(): string {
    return "API";
  }
}
