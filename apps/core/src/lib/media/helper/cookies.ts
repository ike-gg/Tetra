import fs from "node:fs";
import path from "node:path";

import { env } from "@/env";

/**
 * Writes the decoded `MEDIA_COOKIES` into `dir` and returns the file's path. Both tools
 * write the cookie jar back on exit, so every run gets its own copy.
 */
export const prepareCookies = (dir: string): string | undefined => {
  if (!env.MEDIA_COOKIES) return undefined;

  const target = path.join(dir, "cookies.txt");
  fs.writeFileSync(target, env.MEDIA_COOKIES, { mode: 0o600 });
  return target;
};
