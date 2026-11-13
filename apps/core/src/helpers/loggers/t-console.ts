import chalk from "chalk";

import { isDevelopment } from "@/env";

export abstract class TConsole {
  abstract get prefix(): string;

  static log(...args: unknown[]) {
    console.log(chalk.black(`• [${this.getPrefix()}] -`, ...args));
  }

  static warn(...args: unknown[]) {
    console.warn(chalk.yellow(`! [${this.getPrefix()}]  -`, ...args));
  }

  static error(...args: unknown[]) {
    console.error(chalk.red(`⨯ [${this.getPrefix()}] -`, ...args));
  }

  static info(...args: unknown[]) {
    console.info(chalk.blue(`ℹ [${this.getPrefix()}] -`, ...args));
  }

  static success(...args: unknown[]) {
    console.info(chalk.green(`✓ [${this.getPrefix()}] -`, ...args));
  }

  static get dev() {
    return {
      log: (...args: unknown[]) => isDevelopment && this.log("🔨", ...args),
      warn: (...args: unknown[]) => isDevelopment && this.warn("🔨", ...args),
      error: (...args: unknown[]) => isDevelopment && this.error("🔨", ...args),
      info: (...args: unknown[]) => isDevelopment && this.info("🔨", ...args),
      success: (...args: unknown[]) => isDevelopment && this.success("🔨", ...args),
    };
  }

  private static getPrefix(): string {
    const instance = new (this as unknown as new () => TConsole)();
    return `${instance.prefix}`;
  }
}
