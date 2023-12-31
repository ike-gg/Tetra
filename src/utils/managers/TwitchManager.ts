import { ApiClient } from "@twurple/api";
import { RefreshingAuthProvider } from "@twurple/auth";
import { Emote } from "../../types";
import { env } from "../../env";

const authProvider = new RefreshingAuthProvider({
  clientId: env.twitchClientId!,
  clientSecret: env.twitchSecretKey!,
});

const twitchApi = new ApiClient({ authProvider });

export class TwitchManager {
  private client = twitchApi;

  static async getLiveChannels(query: string) {
    try {
      const liveChannels = await twitchApi.search.searchChannels(query, {
        liveOnly: true,
        limit: 10,
      });
      return liveChannels.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error("Uncaught error while fetching live channels list.");
      }
    }
  }

  static async getChannels(query: string) {
    try {
      const channels = await twitchApi.search.searchChannels(query, {
        limit: 10,
      });
      return channels.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error("Uncaught error while fetching channels list.");
      }
    }
  }

  static async getChannel(channelName: string) {
    try {
      const channel = await twitchApi.users.getUserByName(channelName);
      return channel;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error("Uncaught error while fetching channel details.");
      }
    }
  }

  static async getChannelEmotes(channelId: string): Promise<Emote[]> {
    try {
      const emotes = await twitchApi.chat.getChannelEmotes(channelId);

      return emotes.map((emote) => {
        const { formats, id, name } = emote;

        const isAnimated = formats.includes("animated");
        const url = isAnimated
          ? emote.getAnimatedImageUrl("3.0")
          : emote.getStaticImageUrl("3.0");

        const previewUrl = isAnimated
          ? emote.getAnimatedImageUrl("2.0")
          : emote.getStaticImageUrl("2.0");

        return {
          animated: formats.includes("animated"),
          author: "twitch channel",
          file: {
            preview: previewUrl!,
            url: url!,
          },
          id: id,
          name: name,
          origin: "twitch",
        };
      });
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error("Uncaught error while fetching emotes from channel.");
      }
    }
  }
}
