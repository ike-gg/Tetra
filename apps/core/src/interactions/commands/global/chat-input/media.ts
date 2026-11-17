import {
  ApplicationIntegrationType,
  AttachmentBuilder,
  type ChatInputCommandInteraction,
  type ContainerBuilder,
  InteractionContextType,
  type InteractionReplyOptions,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import { MEDIA_MESSAGE_FLAGS, mediaResultMessage } from "@/components/media.component";
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
  handleYouTubeVideo,
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
import type { TopLevelComponent } from "@/utils/discord/components-v2";
import { feedbackPayload } from "@/utils/discord/feedback-payload";
import type { TetraEmbedContent } from "@/utils/embed-messages/tetra-embed";
import { createErrorCode, logErrorCode, reportWithCode } from "@/utils/error-code";
import isValidURL from "@/utils/is-valid-url";
import { FeedbackManager } from "@/utils/managers/feedback-manager";
import { removeQueryFromUrl } from "@/utils/remove-query-from-url";

interface PlatformHandler {
  name: string;
  hostnames: string[];
  handler: PlatformHandlerCallback;
  /** Custom platform emoji for the meta line; without one the name is shown */
  emote?: string;
}

const supportedPlatforms: PlatformHandler[] = [
  {
    name: "X",
    handler: handleTwitterMedia,
    hostnames: ["twitter.com", "x.com", "fxtwitter.com"],
    emote: "<:_tetra_symbol_x:1245824654568984687>",
  },
  {
    name: "Instagram",
    handler: handleInstagramMedia,
    hostnames: ["instagram.com", "www.instagram.com"],
    emote: "<:_tetra_symbol_ig:1245824656154562560>",
  },
  {
    name: "TikTok",
    handler: handleTikTokMedia,
    hostnames: ["tiktok.com", "www.tiktok.com"],
    emote: "<:_tetra_symbol_tiktok:1245824660726349945>",
  },
  {
    name: "Twitch",
    handler: handleTwitchClip,
    hostnames: ["twitch.tv"],
    emote: "<:_tetra_symbol_twitch:1245824662177448036>",
  },
  {
    // Shorts and videos up to 90 s; www., m. and music. match as subdomains
    name: "YouTube",
    handler: handleYouTubeVideo,
    hostnames: ["youtube.com", "youtu.be"],
  },
  {
    name: "Kick",
    handler: handleKickClip,
    hostnames: ["kick.com"],
  },
  {
    name: "Streamable",
    handler: handleStreamableMedia,
    hostnames: ["streamable.com"],
    emote: "<:_tetra_symbol_streamable:1245825591089827861>",
  },
];

export const supportedMediaPlatforms = supportedPlatforms;

// Discord's interaction token lives 15 min: wait at most 10, then run at most 4
const QUEUE_WAIT_LIMIT_MS = 10 * 60 * 1000;
const JOB_TIMEOUT_MS = 4 * 60 * 1000;
const POSITION_EDIT_INTERVAL_MS = 5000;

const MEDIA_UNAVAILABLE = "`/media` is unavailable right now. try again in a minute";

const toMediaError = (error: unknown) => {
  if (error instanceof MediaQueueUnavailableError)
    return new EmbeddedError(MEDIA_UNAVAILABLE);
  if (error instanceof MediaQueueWaitTimeoutError) {
    return new EmbeddedError(
      "the download queue is too long right now. try again in a few minutes"
    );
  }
  if (error instanceof MediaJobTimeoutError || error instanceof CommandAbortedError) {
    return new EmbeddedError(
      "this took longer than 4 min, so i stopped it. try again or pick a shorter clip"
    );
  }
  if (error instanceof MediaLockLostError) {
    return new EmbeddedError("the download was interrupted. try again");
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
    "download a video or images from X, Instagram, TikTok, YouTube, Twitch, Kick or Streamable"
  )
  .addStringOption((option) =>
    option.setName("link").setDescription("link to the post or clip").setRequired(true)
  );

interface MediaPayload extends Pick<InteractionReplyOptions, "files"> {
  components: (ContainerBuilder | TopLevelComponent)[];
  allowedMentions: { parse: never[] };
}

// Progress and errors use the generic reply style; only the result has the platform colour
const mediaStatus = (title: string, detail?: string) =>
  feedbackPayload("working", detail ? `${title}\n-# ${detail}` : title);
const mediaError = (content: TetraEmbedContent) =>
  feedbackPayload("error", content, { rows: FeedbackManager.errorRows() });
const mediaWarning = (content: TetraEmbedContent) => feedbackPayload("warning", content);

/** Every /media state goes through here, so the message is v2 from its first reply. */
class MediaReply {
  constructor(private readonly interaction: ChatInputCommandInteraction) {}

  async send(
    { components, allowedMentions, files }: MediaPayload,
    { ephemeral = false } = {}
  ) {
    const payload = { components, allowedMentions, files };
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
      await this.send(mediaError(mapped.embed));
      return;
    }

    const code = createErrorCode();
    logErrorCode(code, mapped);
    await this.send(mediaError(`something broke on my side. ${reportWithCode(code)}`));
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
  const { description, media, metadata, url } = await platform.handler(itemUrl, {
    progress: (text) =>
      reply.send(mediaStatus(`downloading from ${platform.name}`, text)),
    fileLimit,
    signal,
  });

  const totalFilesSize = media.reduce((curr, acc) => curr + (acc.size ?? 0), 0);
  if (totalFilesSize > fileLimit) {
    throw new FileLimitExceededError(fileLimit, {
      size: totalFilesSize,
    });
  }

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
      url: url ?? removeQueryFromUrl(itemUrl),
    }),
    files,
  });
};

export default new ChatInputCommandHandler(command, async (interaction) => {
  const input = interaction.options.getString("link");

  if (!input) return;

  // Discord sends the real limit (guild boost level, perks) with every interaction
  const fileLimit = interaction.attachmentSizeLimit;
  const reply = new MediaReply(interaction);

  try {
    const itemUrl = input.split(" ").find((i) => isValidURL(i));

    if (!itemUrl) {
      await reply.send(mediaError(Messages.INVALID_REFERENCE));
      return;
    }

    const { hostname: host } = new URL(itemUrl);

    // Exact host or subdomain: the URL goes to yt-dlp / gallery-dl, which fetch it
    const platform = supportedPlatforms.find((p) =>
      p.hostnames.some((hostname) => host === hostname || host.endsWith(`.${hostname}`))
    );

    if (!platform) {
      await reply.send(mediaError(Messages.METDIA_PLATFORM_NOT_SUPPORED));
      return;
    }

    // One request per user, waiting or running; checked before the first (public) reply
    let claimed: boolean;
    try {
      claimed = await mediaQueue.claimUser(interaction.user.id, interaction.id);
    } catch {
      await reply.send(mediaWarning(MEDIA_UNAVAILABLE), { ephemeral: true });
      return;
    }

    if (!claimed) {
      await reply.send(
        mediaWarning(
          "you already have a `/media` download running. try again when it's done"
        ),
        { ephemeral: true }
      );
      return;
    }

    try {
      await reply.send(mediaStatus(`downloading from ${platform.name}`));

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
              mediaStatus(
                `in queue: #${position}`,
                "another download is running, this updates by itself"
              )
            );
          },
        },
        async (signal) => {
          if (shownPosition !== undefined) {
            await reply.send(mediaStatus(`downloading from ${platform.name}`));
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
