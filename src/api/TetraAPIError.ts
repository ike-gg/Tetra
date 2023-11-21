export class TetraAPIError extends Error {
  constructor(public code: number, public message: string) {
    super(message);
    this.code = code;
  }

  public toString(): string {
    return `${this.code}: ${this.message}`;
  }
}
