import { spawn } from "bun";

import { Arguments } from "./x-gifsicle";

// Placeholders resolved to stdin/stdout ("-"), so no temp files are needed.
const input = Symbol("inputPath");
const output = Symbol("outputPath");

export const execBunBufferSymbol = {
  input,
  output,
};

const DEFAULT_TIMEOUT_MS = 30_000;

export class GifsicleError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number | null,
    public readonly stderr: string
  ) {
    super(message);
    this.name = "GifsicleError";
  }
}

export const execBunBuffer = async (opts: {
  input: Buffer;
  bin: string;
  args: Arguments;
  timeoutMs?: number;
}): Promise<Buffer> => {
  const { input: inputBuffer, bin, args, timeoutMs = DEFAULT_TIMEOUT_MS } = opts;

  if (!Buffer.isBuffer(inputBuffer)) {
    throw new Error("Input is required and must be a Buffer");
  }

  const cmd = args.map((arg) => {
    if (arg === input || arg === output) return "-";
    return String(arg);
  });

  const proc = spawn({
    cmd: [bin, ...cmd],
    stdin: inputBuffer,
    stdout: "pipe",
    stderr: "pipe",
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeoutMs);

  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).arrayBuffer(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    if (timedOut) {
      throw new GifsicleError(`gifsicle timed out after ${timeoutMs}ms`, exitCode, stderr);
    }

    if (exitCode !== 0 || stdout.byteLength === 0) {
      throw new GifsicleError(
        `gifsicle failed (exit code ${exitCode}): ${stderr.trim() || "no output"}`,
        exitCode,
        stderr
      );
    }

    return Buffer.from(stdout);
  } finally {
    clearTimeout(timer);
  }
};

export { input, output };
