import { tmpdir } from "os";
import * as fs from "fs";
import { env } from "../env";

export const enviroment =
  process.env.env === "development" ? "development" : "production";

export const maxEmoteSize = 262144;
export const maxSupportedSize = maxEmoteSize * 16;

export const redirect_uri =
  enviroment === "development"
    ? "http://localhost:3001/dashboard/auth"
    : "https://tetra.lol/api/auth/callback";

export const dashboardUrl =
  enviroment === "development"
    ? "https://localhost:3001/dashboard"
    : "https://tetra.lol/dashboard";

export const tetraTempDirectory = (subPath: string) => {
  const basePath = `${tmpdir()}/tetra`;

  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath);
  }

  const tempPath = `${basePath}/${subPath}`;
  if (!fs.existsSync(tempPath)) {
    fs.mkdirSync(tempPath);
  }

  if (env.node_env === "development") {
    console.log("created temp directory at", tempPath);
  }

  setTimeout(() => {
    fs.rmSync(tempPath, { recursive: true, force: true });
  }, 1000 * 60 * 60);

  return tempPath;
};
