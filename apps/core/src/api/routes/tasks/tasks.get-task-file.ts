import { MAX_SUPPORTED_SIZE } from "@/constants";
import { ResourceTooLargeError } from "@/constants/errors";
import getBufferFromUrl from "@/emotes/source/get-buffer-from-url";
import { UrlNotAllowedError } from "@/lib/network/url-guard";

import { userFactory } from "../../api-env";
import { requireUser } from "../../middleware/auth";
import { TetraAPIError } from "../../tetra-api-error";
import { validate } from "../../validate";
import { findUserTask, taskParamsSchema } from "./tasks.shared";

const startsWith = (buffer: Buffer, bytes: number[], offset = 0) =>
  bytes.every((byte, index) => buffer[offset + index] === byte);

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

/** Image type from magic bytes; upstream Content-Type headers are often wrong or generic. */
export const sniffImageType = (buffer: Buffer) => {
  if (startsWith(buffer, ascii("GIF87a")) || startsWith(buffer, ascii("GIF89a"))) {
    return "image/gif";
  }
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (startsWith(buffer, ascii("RIFF")) && startsWith(buffer, ascii("WEBP"), 8)) {
    return "image/webp";
  }
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return "image/jpeg";
  return null;
};

/**
 * The task's source file, proxied so the browser editor doesn't depend on CORS headers
 * of third-party hosts. The URL was set by the bot, but it may come from a user-supplied
 * link, so it goes through the same guard as the bot's download (`safeFetch`).
 */
export const tasksGetTaskFile = userFactory.createHandlers(
  requireUser,
  validate("param", taskParamsSchema),
  async (c) => {
    const { taskId } = c.req.valid("param");

    const task = await findUserTask(taskId, c.get("user").id);

    let file: Buffer;
    try {
      file = await getBufferFromUrl(task.emote.url, {
        maxRetries: 2,
        msBetweenRetries: 500,
        maxBufferSize: MAX_SUPPORTED_SIZE,
        timeoutMs: 15_000,
      });
    } catch (error) {
      if (error instanceof UrlNotAllowedError) {
        throw new TetraAPIError(400, error.message, "URL_NOT_ALLOWED");
      }
      if (error instanceof ResourceTooLargeError) throw error;
      throw new TetraAPIError(
        502,
        "Failed to download the source file",
        "DOWNLOAD_DATA_FAILED"
      );
    }

    const contentType = sniffImageType(file);
    if (!contentType) {
      throw new TetraAPIError(
        415,
        "The source file is not a GIF, PNG, WebP or JPEG image",
        "UNSUPPORTED_FILE_TYPE"
      );
    }

    return c.body(new Uint8Array(file), 200, {
      "Content-Type": contentType,
      "Content-Length": String(file.byteLength),
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    });
  }
);
