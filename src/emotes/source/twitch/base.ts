import dotenv from "dotenv";
import { HeadersInit } from "node-fetch";
dotenv.config();

export interface ErrorResponse {
  error: string;
  status: number;
  message: string;
}

const twitchClientId = process.env.twitchClientId as string;
const twitchSecretKey = process.env.twitchSecretKey as string;

const authHeaders: HeadersInit = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${twitchSecretKey}`,
  "Client-Id": twitchClientId,
};

const endpoints = {
  checkChannel(channelName: string) {
    return `https://api.twitch.tv/helix/users?login=${channelName}`;
  },
  fetchEmotes(channelId: string) {
    return `https://api.twitch.tv/helix/chat/emotes?broadcaster_id=${channelId}`;
  },
};

export { authHeaders, endpoints };
