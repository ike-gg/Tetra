import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "@/env";

const VERSION = "v1";
const IV_BYTES = 12;

/** AES-256-GCM. Stored as `v1:<iv>:<tag>:<ciphertext>` (base64 parts). */
export const encryptToken = (plain: string, key: Buffer = env.TOKEN_ENCRYPTION_KEY) => {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);

  return [
    VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
};

/**
 * Values without the `v1:` prefix are plaintext written before encryption was added and are
 * returned as they are; every write encrypts, so they get replaced on the next token write.
 * Throws if an encrypted value is damaged or was encrypted with another key.
 */
export const decryptToken = (stored: string, key: Buffer = env.TOKEN_ENCRYPTION_KEY) => {
  if (!stored.startsWith(`${VERSION}:`)) return stored;

  const [, iv, tag, encrypted] = stored.split(":");

  if (!iv || !tag || !encrypted) throw new Error("Malformed encrypted token");

  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
};
