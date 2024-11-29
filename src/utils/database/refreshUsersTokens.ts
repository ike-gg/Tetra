import { PrismaClient } from "@prisma/client";
import { env } from "../../env";

interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

const SIX_HOURS_IN_SECONDS = 60 * 60 * 6;

export const refreshUsersTokens = async () => {
  const prisma = new PrismaClient();
  const users = await prisma.account.findMany({
    where: {
      expires_at: {
        lte: new Date().getTime() / 1000 + SIX_HOURS_IN_SECONDS,
      },
    },
  });

  users.forEach(async (user) => {
    try {
      const { refresh_token, id } = user;

      if (!refresh_token) return;

      const urlForm = {
        client_id: env.oauthClientId,
        client_secret: env.oauthClientSecret,
        grant_type: "refresh_token",
        refresh_token: refresh_token!,
      };

      const response = await fetch("https://discord.com/api/v10/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(urlForm),
      });

      const data = (await response.json()) as RefreshTokenResponse;

      if (!response.ok) throw data;

      const updated = await prisma.account.update({
        where: {
          id,
        },
        data: {
          access_token: data.access_token,
          expires_at: Date.now() / 1000 + data.expires_in,
          refresh_token: data.refresh_token,
        },
      });
      console.log("Updated token for:", updated.providerAccountId);
    } catch (error) {
      console.error(
        "[user will be deleted] Update token failed for:",
        user.providerAccountId,
        error
      );
      await prisma.account.delete({
        where: {
          id: user.id,
        },
      });
    }
  });
};
