import { randomInt } from "node:crypto";

import { CoreConsole } from "#/loggers";

// No 0/O, 1/I/L: people read the code off a screen and type it into a report
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LENGTH = 5;

/** A short code like `A7F2K` (31^5 ≈ 28.6 M values): log it with a timestamp, show it. */
export const createErrorCode = () =>
  Array.from({ length: LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/** What every "something broke on my side" text ends with. */
export const reportWithCode = (code: string) =>
  `try again, and if it keeps happening, report it with code \`${code}\``;

/** Finds the code in a reply's text (the error-log forward reads it back). */
export const findErrorCode = (text: string) =>
  /report it with code `([A-Z0-9_]+)`/.exec(text)?.[1];

/**
 * Logs an error under its code. Codes can repeat, so the line carries the time too:
 * code + time identify one error.
 */
export const logErrorCode = (code: string, ...details: unknown[]) => {
  CoreConsole.error(`[ ${code} ] ${new Date().toISOString()}`, ...details);
};
