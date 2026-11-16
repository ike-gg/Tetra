import { spawn } from "bun";

export interface CommandResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/** Runs a binary without a shell; never rejects on a non-zero exit, the caller decides. */
export const runCommand = async (
  cmd: string[],
  { timeoutMs, cwd }: { timeoutMs: number; cwd?: string }
): Promise<CommandResult> => {
  const proc = spawn({ cmd, cwd, stdin: "ignore", stdout: "pipe", stderr: "pipe" });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill("SIGKILL");
  }, timeoutMs);

  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);

    return { exitCode, stdout, stderr, timedOut };
  } finally {
    clearTimeout(timer);
  }
};
