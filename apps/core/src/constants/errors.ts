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
    "-# This feature is unsupported, submit an issue on the GitHub repository if you want this feature to be added.",
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
    super({
      title: "Not supported file.",
      description: "The file you are trying to upload is not a supported image.",
    });
    this.name = "UnsupportedEmoteFileError";
  }
}

/** A download exceeded its size limit. Mapped by type in the API (`FILE_TOO_LARGE`). */
export class ResourceTooLargeError extends EmbeddedError {
  constructor() {
    super({
      title: "Resource too large",
      description:
        "The resource you are trying to fetch is too large to be processed by Tetra.",
    });
    this.name = "ResourceTooLargeError";
  }
}
