import { spawn } from "bun";

export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export class CommandAbortedError extends Error {
  constructor() {
    super("Command aborted");
    this.name = "CommandAbortedError";
  }
}

/**
 * Runs a binary without a shell; never rejects on a non-zero exit, the caller decides.
 * `signal` (e.g. the /media job timeout) kills the process and rejects.
 */
export const runCommand = async (
  cmd: string[],
  { timeoutMs, cwd, signal }: { timeoutMs: number; cwd?: string; signal?: AbortSignal }
): Promise<CommandResult> => {
  if (signal?.aborted) throw new CommandAbortedError();

  const proc = spawn({ cmd, cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe" });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill("SIGKILL");
  }, timeoutMs);
  const onAbort = () => proc.kill("SIGKILL");
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    if (signal?.aborted) throw new CommandAbortedError();

    return { exitCode, stdout, stderr, timedOut };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
};
