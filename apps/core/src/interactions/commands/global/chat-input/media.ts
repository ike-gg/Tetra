import { randomUUID } from "node:crypto";
import {
  ApplicationIntegrationType,
  AttachmentBuilder,
  type ChatInputCommandInteraction,
  InteractionContextType,
  type InteractionReplyOptions,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import {
  MEDIA_MESSAGE_FLAGS,
  mediaErrorMessage,
  mediaResultMessage,
  mediaStatusMessage,
  mediaWarningMessage,
} from "@/components/media.component";
import { EmbeddedError } from "@/constants/errors";
import { Messages } from "@/constants/messages";
import { ChatInputCommandHandler } from "@/interactions";
import {
  handleInstagramMedia,
  handleKickClip,
  handleStreamableMedia,
  handleTikTokMedia,
  handleTwitchClip,
  handleTwitterMedia,
} from "@/lib/media";
import { FileLimitExceededError } from "@/lib/media/helper/media-errors";
import { CommandAbortedError } from "@/lib/media/helper/run-command";
import {
  MediaJobTimeoutError,
  MediaLockLostError,
  MediaQueueUnavailableError,
  MediaQueueWaitTimeoutError,
  mediaQueue,
} from "@/lib/media/queue";
import type { PlatformHandlerCallback } from "@/lib/media/types";
import isValidURL from "@/utils/is-valid-url";
import { removeQueryFromUrl } from "@/utils/remove-query-from-url";

import { BotConsole } from "#/loggers";

interface PlatformHandler {
  name: string;
  hostnames: string[];
  handler: PlatformHandlerCallback;
  color: number;
  emote: string;
}

const supportedPlatforms: PlatformHandler[] = [
  {
    name: "X",
    handler: handleTwitterMedia,
    hostnames: ["twitter.com", "x.com", "fxtwitter.com"],
    color: 0x1da1f2,
    emote: "<:_tetra_symbol_x:1245824654568984687>",
  },
  {
    name: "Instagram",
    handler: handleInstagramMedia,
    hostnames: ["instagram.com", "www.instagram.com"],
    color: 0xc32aa3,
    emote: "<:_tetra_symbol_ig:1245824656154562560>",
  },
  {
    name: "TikTok",
    handler: handleTikTokMedia,
    hostnames: ["tiktok.com", "www.tiktok.com"],
    color: 0x010101,
    emote: "<:_tetra_symbol_tiktok:1245824660726349945>",
  },
  {
    name: "Twitch",
    handler: handleTwitchClip,
    hostnames: ["twitch.tv"],
    color: 0x9146ff,
    emote: "<:_tetra_symbol_twitch:1245824662177448036>",
  }, // {
  //   name: "YouTube",
  //   handler: handleYoutubeMedia,
  //   hostnames: ["youtube.com", "youtu.be", "www.youtube.com"],
  // },
  {
    name: "Kick",
    handler: handleKickClip,
    hostnames: ["kick.com"],
    color: 0x53fc18,
    // No custom Kick emoji uploaded yet
    emote: "🟩",
  },
  {
    name: "Streamable",
    handler: handleStreamableMedia,
    hostnames: ["streamable.com"],
    color: 0x007aff,
    emote: "<:_tetra_symbol_streamable:1245825591089827861>",
  },
];

export const supportedMediaPlatforms = supportedPlatforms;

// Discord's interaction token lives 15 min: wait at most 10, then run at most 4
const QUEUE_WAIT_LIMIT_MS = 10 * 60 * 1000;
const JOB_TIMEOUT_MS = 4 * 60 * 1000;
const POSITION_EDIT_INTERVAL_MS = 5000;

const MEDIA_UNAVAILABLE = "`/media` is temporarily unavailable. Try again in a moment.";

const toMediaError = (error: unknown) => {
  if (error instanceof MediaQueueUnavailableError)
    return new EmbeddedError(MEDIA_UNAVAILABLE);
  if (error instanceof MediaQueueWaitTimeoutError) {
    return new EmbeddedError("The queue is too long right now. Try again in a moment.");
  }
  if (error instanceof MediaJobTimeoutError || error instanceof CommandAbortedError) {
    return new EmbeddedError(
      "This took too long and was stopped. Try again in a moment."
    );
  }
  if (error instanceof MediaLockLostError) {
    return new EmbeddedError("The download was interrupted. Try again in a moment.");
  }
  return error;
};

const command = new SlashCommandBuilder()
  .setName("media")
  // Also user-installable: everything below answers through the interaction only
  .setIntegrationTypes(
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall
  )
  .setContexts(
    InteractionContextType.Guild,
    InteractionContextType.BotDM,
    InteractionContextType.PrivateChannel
  )
  .setDescription(
    "Download media from various social media platforms like X, Instagram, TikTok etc."
  )
  .addStringOption((option) =>
    option.setName("url").setDescription("Link to social media post:").setRequired(true)
  );

type MediaPayload = ReturnType<typeof mediaStatusMessage> &
  Pick<InteractionReplyOptions, "files">;

/** Every /media state goes through here, so the message is v2 from its first reply. */
class MediaReply {
  constructor(private readonly interaction: ChatInputCommandInteraction) {}

  async send(payload: MediaPayload, { ephemeral = false } = {}) {
    if (this.interaction.replied || this.interaction.deferred) {
      await this.interaction.editReply(payload);
      return;
    }

    await this.interaction.reply({
      ...payload,
      flags: ephemeral
        ? MEDIA_MESSAGE_FLAGS | MessageFlags.Ephemeral
        : MEDIA_MESSAGE_FLAGS,
    });
  }

  async error(error: unknown) {
    const mapped = toMediaError(error);

    if (mapped instanceof EmbeddedError) {
      await this.send(mediaErrorMessage(mapped.embed));
      return;
    }

    const trackingId = randomUUID();
    BotConsole.error(`[ ${trackingId} ]`, mapped);
    await this.send(
      mediaErrorMessage({
        title: "Unhandled error",
        description: `Something broke on our side. Report it with this ID: \`${trackingId}\``,
      })
    );
  }
}

const processMedia = async ({
  interaction,
  reply,
  platform,
  itemUrl,
  fileLimit,
  signal,
}: {
  interaction: ChatInputCommandInteraction;
  reply: MediaReply;
  platform: PlatformHandler;
  itemUrl: string;
  fileLimit: number;
  signal: AbortSignal;
}) => {
  const { description, media, metadata } = await platform.handler(itemUrl, {
    progress: (text) =>
      reply.send(mediaStatusMessage(platform, `Fetching ${platform.name}...`, text)),
    fileLimit,
    signal,
  });

  const totalFilesSize = media.reduce((curr, acc) => curr + (acc.size ?? 0), 0);
  if (totalFilesSize > fileLimit) throw new FileLimitExceededError();

  const files = media.map((m, index) => {
    const suffix = media.length > 1 ? `_${index + 1}` : "";
    return new AttachmentBuilder(m.source, {
      name: `tetra_${interaction.id}${suffix}.${m.type}`,
    });
  });

  // The job timed out meanwhile and the user already got the error
  if (signal.aborted) return;

  await reply.send({
    ...mediaResultMessage({
      platform,
      attachmentNames: files.map((file) => file.name ?? ""),
      caption: description,
      meta: metadata,
      url: removeQueryFromUrl(itemUrl),
    }),
    files,
  });
};

export default new ChatInputCommandHandler(command, async (interaction) => {
  const input = interaction.options.getString("url");

  if (!input) return;

  // Discord sends the real limit (guild boost level, perks) with every interaction
  const fileLimit = interaction.attachmentSizeLimit;
  const reply = new MediaReply(interaction);

  try {
    const itemUrl = input.split(" ").find((i) => isValidURL(i));

    if (!itemUrl) {
      await reply.send(mediaErrorMessage(Messages.INVALID_REFERENCE));
      return;
    }

    const { hostname: host } = new URL(itemUrl);

    // Exact host or subdomain: the URL goes to yt-dlp / gallery-dl, which fetch it
    const platform = supportedPlatforms.find((p) =>
      p.hostnames.some((hostname) => host === hostname || host.endsWith(`.${hostname}`))
    );

    if (!platform) {
      await reply.send(mediaErrorMessage(Messages.METDIA_PLATFORM_NOT_SUPPORED));
      return;
    }

    // One request per user, waiting or running; checked before the first (public) reply
    let claimed: boolean;
    try {
      claimed = await mediaQueue.claimUser(interaction.user.id, interaction.id);
    } catch {
      await reply.send(mediaWarningMessage(MEDIA_UNAVAILABLE), { ephemeral: true });
      return;
    }

    if (!claimed) {
      await reply.send(
        mediaWarningMessage(
          "You already have a `/media` request in progress. Wait for it to finish, then try again."
        ),
        { ephemeral: true }
      );
      return;
    }

    try {
      await reply.send(mediaStatusMessage(platform, `Fetching ${platform.name}...`));

      let shownPosition: number | undefined;
      let lastEdit = 0;

      await mediaQueue.run(
        interaction.id,
        {
          userId: interaction.user.id,
          deadline: interaction.createdTimestamp + QUEUE_WAIT_LIMIT_MS,
          jobTimeoutMs: JOB_TIMEOUT_MS,
          onPosition: async (position) => {
            if (position === shownPosition) return;
            if (Date.now() - lastEdit < POSITION_EDIT_INTERVAL_MS) return;
            shownPosition = position;
            lastEdit = Date.now();
            await reply.send(
              mediaStatusMessage(
                platform,
                `In queue: #${position}`,
                "Someone else's download is running. This updates on its own."
              )
            );
          },
        },
        async (signal) => {
          if (shownPosition !== undefined) {
            await reply.send(
              mediaStatusMessage(platform, `Fetching ${platform.name}...`)
            );
          }

          await processMedia({
            interaction,
            reply,
            platform,
            itemUrl,
            fileLimit,
            signal,
          });
        }
      );
    } finally {
      await mediaQueue
        .releaseUser(interaction.user.id, interaction.id)
        .catch(() => undefined);
    }
  } catch (error) {
    // The interaction token may be gone (15 min); nothing left to tell the user then
    await reply.error(error).catch(() => undefined);
  }
});
