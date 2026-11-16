import type { GuildEmoji } from "discord.js";

import { supportedMediaPlatforms } from "@/interactions/commands/global/chat-input/media";

import type { TetraEmbedContent } from "../utils/embed-messages/tetra-embed";
import { formatBytes } from "../utils/format-bytes";
import multilineText from "../utils/multiline-text";
import { MAX_EMOTE_SIZE } from ".";

type T = TetraEmbedContent;

// Texts follow docs/voice.md: lowercase, no trailing period, no emoji, first person in errors
export class Messages {
  //generic
  static readonly INTERACTION_TIMEOUT: T = "this menu expired. run the command again";

  static INTERACTION_TIMEOUT_WITH_REASON(reason: string): T {
    return `this menu expired (${reason}). run the command again`;
  }

  static WORKING(): T {
    return "working on it";
  }
  static readonly RATE_LIMIT_EXCEEDED: T =
    "Discord is rate limiting me. i'll finish this by myself once the limit resets";
  static readonly EMOTE_NOT_FOUND: T = "i couldn't find any emotes";
  static readonly MISSING_PERMISSIONS: T =
    "you need the manage expressions permission to use this command";
  static readonly BOT_MISSING_PERMISSIONS: T =
    "i need the create expressions and manage expressions permissions on this server. ask a server admin to add them to tetra's role";
  static readonly INVALID_REFERENCE: T =
    "that link doesn't look valid. check it and try again";
  static readonly FILE_NOT_FOUND: T = "i couldn't find the file";
  static readonly URL_NOT_FOUND: T = "i couldn't find that link";
  static readonly ERROR_GUILD_ONLY: T = "this only works in a server";

  static readonly ERROR_LOG_UNAVAILABLE: T = "error reports aren't set up for this bot";

  static readonly TASK_IN_EDITOR: T = multilineText(
    "emote ready in the editor. open the panel to adjust it and add it to this server",
    "-# you may need to log in with Discord first"
  );

  //emote case
  static readonly MULTIPLE_EMOTES_NOT_SUPPORTED: T =
    "i can only add one emote at a time here";

  //guilds case
  static readonly NO_COMMON_SERVERS_PERMISSIONS: T =
    "i couldn't find a server we share where you have the manage expressions permission";

  //special
  static readonly NEW_MEDIA_COMMAND: T =
    "this command was replaced by `/media`, which downloads from X, Instagram, TikTok and more in one command";

  //media
  static readonly METDIA_PLATFORM_NOT_SUPPORED: T =
    `i can't download from that site yet. supported:
${supportedMediaPlatforms.map((media) => `- ${media.name} (${media.hostnames.join(", ")})`).join("\n")}`;

  //twitch case
  static readonly CHANNEL_NOT_FOUND: T = "i couldn't find that Twitch channel";

  //interactive

  static ADDED_EMOTE(emote: GuildEmoji): T {
    return {
      description: `added \`${emote.name}\` ${emote} to \`${emote.guild.name}\``,
      image: {
        url: emote.imageURL({ animated: true, size: 256 }),
      },
    };
  }

  static EXCEEDED_EMOTE_SIZE(size: number): T {
    const maxSize = formatBytes(MAX_EMOTE_SIZE);
    const emoteSize = formatBytes(size);

    return `this emote is ${emoteSize} and Discord allows ${maxSize}. choose how to shrink it`;
  }

  static REMAINING_EMOTE_SLOTS_WARNING({
    remainingSlots,
    emoteType,
  }: {
    remainingSlots: number;
    emoteType: "animated" | "static";
  }): T {
    return remainingSlots === 0
      ? `this server has no free ${emoteType} emote slots. remove one or boost the server for more`
      : `only ${remainingSlots} ${emoteType} slot${remainingSlots !== 1 ? "s" : ""} left`;
  }

  static NOT_ENOUGH_EMOTE_SLOTS_SLICES({
    remainingSlots,
    uploadCount,
    emoteType,
  }: {
    remainingSlots: number;
    uploadCount: number;
    emoteType: "animated" | "static";
  }): T {
    return `not enough emote slots: ${uploadCount} parts need ${uploadCount} ${emoteType} slots and ${remainingSlots} ${remainingSlots !== 1 ? "are" : "is"} free. remove some emotes or split into fewer parts`;
  }

  static ANNOUNCE_ADDED_EMOTE(emote: GuildEmoji): string {
    return `someone added ${emote} to their server`;
  }

  static ANNOUNCE_ADDED_MULTIPLE_EMOTES(emote: GuildEmoji[]): string {
    return `someone added ${emote.join()} to their server`;
  }

  static ANNOUNCE_ADDED_EMOTE_PANEL(emote: GuildEmoji): string {
    return `> someone added ${emote} to their server with the panel`;
  }
}
