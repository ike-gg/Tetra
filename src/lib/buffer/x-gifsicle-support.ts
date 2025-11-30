//@ts-nocheck
import { spawn } from "bun";
import { promises as fs } from "fs";
import path from "path";

import { Arguments } from "./xGifsicle";

import { TempFileManager } from "#/files/temp-file-manager";

// Define unique symbols for input and output placeholders
const input = Symbol("inputPath");
const output = Symbol("outputPath");

export const execBunBufferSymbol = {
  input,
  output,
};

export const execBunBuffer = async (opts: {
  input: Buffer;
  bin: any;
  args: Arguments;
}) => {
  // Create a shallow copy of options to avoid mutating the original object
  opts = Object.assign({}, opts);

  // Validate the input options
  if (!Buffer.isBuffer(opts.input)) {
    throw new Error("Input is required and must be a Buffer");
  }

  if (typeof opts.bin !== "string") {
    throw new Error("Binary is required and must be a string");
  }

  if (!Array.isArray(opts.args)) {
    throw new Error("Arguments are required and must be an array");
  }

  const tempDir = TempFileManager.create();
  const inputPath = path.join(tempDir, "input");
  const outputPath = path.join(tempDir, "output");

  opts.args = opts.args.map((arg) => {
    if (arg === input) return inputPath;
    if (arg === output) return outputPath;
    return arg;
  });

  try {
    await fs.writeFile(inputPath, opts.input);

    const proc = spawn({
      cmd: [opts.bin, ...opts.args],
      stdout: "inherit", // Inherit stdout to display output in the console
      stderr: "inherit", // Inherit stderr to display errors in the console
    });

    await proc.exited;

    const outputData = await fs.readFile(outputPath);

    return outputData;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

export { input, output };
