import chalk from "chalk";
import { isDevelopment } from "../env";

export abstract class TConsole {
  abstract get prefix(): string;

  static log(...args: any[]) {
    console.log(chalk.black(`[${this.getPrefix()} 📝] -`, ...args));
  }

  static warn(...args: any[]) {
    console.warn(chalk.yellow(`[${this.getPrefix()} ⚠️ ]  -`, ...args));
  }

  static error(...args: any[]) {
    console.error(chalk.red(`[${this.getPrefix()} ❌] -`, ...args));
  }

  static info(...args: any[]) {
    console.info(chalk.blue(`[${this.getPrefix()} ℹ️ ] -`, ...args));
  }

  static success(...args: any[]) {
    console.info(chalk.green(`[${this.getPrefix()} ✅] -`, ...args));
  }

  static get dev() {
    return {
      log: (...args: any[]) => isDevelopment && this.log("🔨", ...args),
      warn: (...args: any[]) => isDevelopment && this.warn("🔨", ...args),
      error: (...args: any[]) => isDevelopment && this.error("🔨", ...args),
      info: (...args: any[]) => isDevelopment && this.info("🔨", ...args),
      success: (...args: any[]) => isDevelopment && this.success("🔨", ...args),
    };
  }

  private static getPrefix(): string {
    const instance = new (this as any)();
    return `${instance.prefix}`;
  }
}
