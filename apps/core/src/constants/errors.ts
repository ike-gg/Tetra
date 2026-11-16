import type { TetraEmbedContent } from "../utils/embed-messages/tetra-embed";
import { createErrorCode, logErrorCode, reportWithCode } from "../utils/error-code";
import { formatBytes } from "../utils/format-bytes";

export enum ErrorType {
  WARNING = "warning",
  ERROR = "error",
  UNHANDLED_ERROR = "unhandled_error",
}

interface EmbeddedErrorOptions {
  type: ErrorType;
  unsupportedFeature: boolean;
  unexpected: boolean;
  origin: unknown;
}

const defaultOptions: EmbeddedErrorOptions = {
  type: ErrorType.ERROR,
  unsupportedFeature: false,
  unexpected: false,
  origin: undefined,
};

const errorStaticMessages = {
  unsupportedFeature:
    "-# this isn't supported yet. open an issue on GitHub if you'd like it",
};

export class EmbeddedError extends Error {
  public embed: TetraEmbedContent;

  public readonly type: ErrorType;
  public readonly options: EmbeddedErrorOptions;

  constructor(content: TetraEmbedContent, options?: Partial<EmbeddedErrorOptions>) {
    const _options = {
      ...defaultOptions,
      ...options,
    };

    if (typeof content === "string") {
      super(content);

      if (_options.unsupportedFeature) {
        content = `${content}
${errorStaticMessages.unsupportedFeature}`;
      }
    } else {
      const { title, description } = content;
      const message = `${title ? `${title}: ` : ""}${description}`;
      super(message);

      if (_options.unsupportedFeature) {
        content.description = `${description}
${errorStaticMessages.unsupportedFeature}`;
      }
    }

    this.embed = content;
    this.type = _options.type;
    this.options = _options;
  }
}

/**
 * The optimizer couldn't get an emote under Discord's size limit. A subclass, so the bot
 * still handles it as an `EmbeddedError` and the API can map it by type, not by text.
 */
export class EmoteTooLargeError extends EmbeddedError {
  constructor(description: string) {
    super({ title: "Emote is too large", description });
  }
}

/** The file isn't an image sharp can read. Mapped by type in the API (`INVALID_EMOTE_FILE`). */
export class UnsupportedEmoteFileError extends EmbeddedError {
  constructor() {
    super("that file isn't an image i can read. try a different file");
    this.name = "UnsupportedEmoteFileError";
  }
}

/** A download exceeded its size limit. Mapped by type in the API (`FILE_TOO_LARGE`). */
export class ResourceTooLargeError extends EmbeddedError {
  /** `size` only where it's known (a declared `Content-Length`). */
  constructor(
    public readonly limit: number,
    size?: number
  ) {
    super(
      size
        ? `that file is ${formatBytes(size)} and i can process up to ${formatBytes(limit)}. try a smaller one`
        : `that file is over the ${formatBytes(limit)} i can process. try a smaller one`
    );
    this.name = "ResourceTooLargeError";
  }
}

/**
 * Something broke on our side with no next step for the user: the text ends with a
 * generated code, which is logged with the time and `origin` when the error is created.
 */
export class InternalError extends EmbeddedError {
  public readonly code: string;

  /** `what` continues "something broke on my side", e.g. "i lost track of this server". */
  constructor(what: string, origin?: unknown) {
    const code = createErrorCode();
    super(`something broke on my side, ${what}. ${reportWithCode(code)}`, { origin });
    this.code = code;
    this.name = "InternalError";
    logErrorCode(code, what, ...(origin === undefined ? [] : [origin]));
  }
}
