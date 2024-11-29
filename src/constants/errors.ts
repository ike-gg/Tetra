import { TetraEmbedContent } from "../utils/embedMessages/TetraEmbed";

export enum ErrorType {
  WARNING = "warning",
  ERROR = "error",
  UNHANDLED_ERROR = "unhandled_error",
}

interface EmbeddedErrorOptions {
  type: ErrorType;
  unsupportedFeature: boolean;
  unexpected: boolean;
  origin: any;
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
