//todo

export class TetraAPIError extends Error {
  constructor(public code: number, public message: string) {
    if (message.length > 128) {
      message = message.slice(0, 128) + "...";
    }
    super(message);
    this.code = code;
  }

  public toString(): string {
    return `${this.code}: ${this.message}`;
  }
}
