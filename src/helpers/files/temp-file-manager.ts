import * as fs from "node:fs";
import path from "node:path";

import { TIME } from "@/constants/time";
import { env } from "@/env";

import { TConsole } from "#/loggers/t-console";

class FileConsole extends TConsole {
  get prefix(): string {
    return "FILE";
  }
}

// The temp dir can be the system one, so only directories with these prefixes are swept.
const TEMP_PREFIX = "tetra-tmp-";
const PERSISTENT_PREFIX = "tetra-keep-";

// Fresh dirs are skipped: their owner may not have stored its state (e.g. the Redis key) yet.
const SWEEP_GRACE = TIME.MINUTE * 2;
const SWEEP_INTERVAL = TIME.MINUTE * 5;

export class TempFileManager {
  static tempDirPath = env.TEMP_DIR_PATH;
  static removeAfter = TIME.MINUTE * 15;

  private static sweeper: ReturnType<typeof setInterval> | undefined;

  /**
   * On startup, removes leftover timer dirs (`tetra-tmp-*`) whose timers died with the old
   * process. Never touches entries without a `tetra-` prefix (the temp dir may be the
   * system one), and keeps persistent dirs (`tetra-keep-*`), which the sweeper handles.
   */
  static cleanup() {
    try {
      if (!fs.existsSync(this.tempDirPath)) {
        FileConsole.dev.log(
          `Temp directory does not exist, creating: ${this.tempDirPath}`
        );
        fs.mkdirSync(this.tempDirPath, { recursive: true });
        return;
      }

      FileConsole.dev.log(`Removing leftover temp directories from: ${this.tempDirPath}`);

      for (const name of fs.readdirSync(this.tempDirPath)) {
        if (!name.startsWith(TEMP_PREFIX)) continue;
        fs.rmSync(path.join(this.tempDirPath, name), { recursive: true, force: true });
      }
    } catch (error) {
      FileConsole.dev.error(`Failed to create temp directory: ${error}`);
    }
  }

  /** Directory that is removed by a timer after `removeAfter`. */
  static create(id?: string) {
    const subTempDir = this.makeDir(`${TEMP_PREFIX}${id ?? Bun.randomUUIDv7()}`);

    setTimeout(() => {
      if (!fs.existsSync(subTempDir)) return;
      FileConsole.dev.log(`Auto-removing temp directory: ${subTempDir}`);
      fs.rmSync(subTempDir, { recursive: true, force: true });
    }, this.removeAfter);

    return subTempDir;
  }

  /**
   * Directory without a timer; it lives as long as `key` is alive according to the
   * `isKeyAlive` callback given to `startSweeper`. Safe to call repeatedly for one key.
   */
  static createPersistent(key: string) {
    return this.makeDir(`${PERSISTENT_PREFIX}${key}`);
  }

  static remove(id: string) {
    const subTempDir = path.join(this.tempDirPath, id);

    if (!fs.existsSync(subTempDir)) {
      return;
    }

    fs.rmSync(subTempDir, { recursive: true, force: true });
    FileConsole.dev.success(`Removed temp directory manually: ${subTempDir}`);
  }

  /**
   * Removes persistent dirs whose key is no longer alive, and timer dirs that outlived
   * their timer (e.g. lost on restart). Other shards' live dirs are kept because
   * liveness comes from `isKeyAlive` (shared state), not from this process.
   */
  static async sweep(isKeyAlive: (key: string) => Promise<boolean>) {
    let names: string[];
    try {
      names = fs.readdirSync(this.tempDirPath);
    } catch {
      return;
    }

    for (const name of names) {
      const isPersistent = name.startsWith(PERSISTENT_PREFIX);
      if (!isPersistent && !name.startsWith(TEMP_PREFIX)) continue;

      const dirPath = path.join(this.tempDirPath, name);

      try {
        const stats = fs.statSync(dirPath);
        if (!stats.isDirectory()) continue;

        const age = Date.now() - stats.mtimeMs;
        if (age < SWEEP_GRACE) continue;

        if (isPersistent) {
          const key = name.slice(PERSISTENT_PREFIX.length);
          if (await isKeyAlive(key)) continue;
        } else if (age < this.removeAfter + SWEEP_GRACE) {
          continue;
        }

        fs.rmSync(dirPath, { recursive: true, force: true });
        FileConsole.dev.log(`Swept temp directory: ${dirPath}`);
      } catch (error) {
        // Keep the dir when liveness is unknown (e.g. Redis down); the next sweep retries.
        FileConsole.error(`Failed to sweep temp directory ${dirPath}:`, error);
      }
    }
  }

  /** Sweeps now and then periodically. Does nothing if already started. */
  static startSweeper(
    isKeyAlive: (key: string) => Promise<boolean>,
    intervalMs = SWEEP_INTERVAL
  ) {
    if (this.sweeper) return;

    const run = () => void this.sweep(isKeyAlive);

    run();
    this.sweeper = setInterval(run, intervalMs);
    this.sweeper.unref();
  }

  private static makeDir(name: string) {
    const subTempDir = path.join(this.tempDirPath, name);

    if (!fs.existsSync(subTempDir)) {
      FileConsole.dev.log(`Creating temp directory: ${subTempDir}`);
      fs.mkdirSync(subTempDir, { recursive: true });
    }

    return subTempDir;
  }
}
