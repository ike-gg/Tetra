import { Request, Response } from "express";
import {
  clientId,
  clientSecret,
  redirect_uri,
  secretPhrase,
} from "../../constants";
import { AES } from "crypto-js";

const monthInMilliseconds = 2629746000;

export default async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: "Missing code. Bad request." });
    return;
  }

  if (!clientId || !clientSecret || !secretPhrase) {
    res.status(503).json({ error: "Internal server error. (MCISP)" });
    return;
  }

  try {
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        scope: "identify",
        redirect_uri: redirect_uri,
      }).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    if (!response.ok) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const oauthData = (await response.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token: string;
      scope: string;
      token_type: string;
    };

    const credentials = JSON.stringify({
      ...oauthData,
      expires_at: Date.now() + oauthData.expires_in * 1000,
    });

    const encrypted = AES.encrypt(credentials, secretPhrase).toString();

    res.cookie("token", encrypted, {
      expires: new Date(Date.now() + monthInMilliseconds),
    });
    res.sendStatus(200);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Internal server error. (TOKEN_REQUEST_FAILED)" });
  }
};
