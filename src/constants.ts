import dotenv from "dotenv";
dotenv.config();

export const enviroment =
  process.env.env === "development" ? "development" : "production";

export const maxEmoteSize = 262144;

export const clientId = process.env.oauthClientId;
export const clientSecret = process.env.oauthClientSecret;

export const secretPhrase = process.env.secretPhrase;

export const tenorApiKey = process.env.tenorApiKey;
export const imgurClientId = process.env.imgurClientId;

export const inviteLink = process.env.inviteLink;

export const redirect_uri =
  enviroment === "development"
    ? "http://localhost:3001/dashboard/auth"
    : "https://tetra.lol/api/auth/callback";

export const dashboardUrl =
  enviroment === "development"
    ? "https://localhost:3001/dashboard"
    : "https://tetra.lol/dashboard";
