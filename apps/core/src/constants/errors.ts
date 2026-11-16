import type { TetraEmbedContent } from "../utils/embed-messages/tetra-embed";

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
  constructor() {
    super("that file is too large for me to process. try a smaller one");
    this.name = "ResourceTooLargeError";
  }
}
