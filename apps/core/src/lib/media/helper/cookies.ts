import fs from "node:fs";
import path from "node:path";

import { env } from "@/env";

import { BotConsole } from "#/loggers";

let warnedMissing = false;

/**
 * Copies `MEDIA_COOKIES_FILE` into `dir` and returns the copy's path. Both tools write the
 * cookie jar back on exit, so they must never get the original file.
 */
export const prepareCookies = (dir: string): string | undefined => {
  const source = env.MEDIA_COOKIES_FILE;
  if (!source) return undefined;

  try {
    const target = path.join(dir, "cookies.txt");
    fs.copyFileSync(source, target);
    return target;
  } catch {
    if (!warnedMissing) {
      warnedMissing = true;
      BotConsole.warn("[media] MEDIA_COOKIES_FILE is set but can't be read, ignoring it");
    }
    return undefined;
  }
};
