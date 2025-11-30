import * as fs from "fs";
import path from "path";

import { TIME } from "@/constants/time";
import { env } from "@/env";

import { TConsole } from "#/loggers/t-console";

class FileConsole extends TConsole {
  get prefix(): string {
    return "FILE";
  }
}

export class TempFileManager {
  static tempDirPath = env.TEMP_DIR_PATH;
  static removeAfter = TIME.MINUTE * 15;

  static cleanup() {
    try {
      if (!fs.existsSync(this.tempDirPath)) {
        FileConsole.dev.log(
          `Temp directory does not exist, creating: ${this.tempDirPath}`
        );
        fs.mkdirSync(this.tempDirPath, { recursive: true });
      } else {
        FileConsole.dev.log(`Clearing temp directory: ${this.tempDirPath}`);
        fs.rmdirSync(this.tempDirPath, { recursive: true });
        fs.mkdirSync(this.tempDirPath);
      }
    } catch (error) {
      FileConsole.dev.error(`Failed to create temp directory: ${error}`);
    }
  }

  static create(id?: string) {
    const dir = id ?? Bun.randomUUIDv7();
    const subTempDir = path.join(this.tempDirPath, dir);

    FileConsole.dev.log(`Creating temp directory: ${subTempDir}`);

    if (!fs.existsSync(subTempDir)) fs.mkdirSync(subTempDir);

    setTimeout(() => {
      if (!fs.existsSync(subTempDir)) return;
      FileConsole.dev.log(`Auto-removing temp directory: ${subTempDir}`);
      fs.rmdirSync(subTempDir, { recursive: true });
    }, this.removeAfter);

    return subTempDir;
  }

  static remove(id: string) {
    const subTempDir = path.join(this.tempDirPath, id);

    if (!fs.existsSync(subTempDir)) {
      return;
    }

    fs.rmdirSync(subTempDir, { recursive: true });
    FileConsole.dev.success(`Removed temp directory manually: ${subTempDir}`);
  }
}
