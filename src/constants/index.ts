import { tmpdir } from "os";
import * as fs from "fs";

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

  setTimeout(() => {
    fs.rmdirSync(tempPath);
  }, 1000 * 60 * 60);

  return tempPath;
};
