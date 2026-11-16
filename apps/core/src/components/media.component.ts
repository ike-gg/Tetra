import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  escapeMarkdown,
  MediaGalleryBuilder,
  MessageFlags,
  TextDisplayBuilder,
  TimestampStyles,
  time,
} from "discord.js";

import type { TetraEmbedContent } from "@/utils/embed-messages/tetra-embed";
import { formatCompactNumber } from "@/utils/format-compact-number";

// /media answers with Components v2 from its first reply on: a message can't drop the
// flag later, and switching a sent embed message to v2 by edit isn't something to rely on
export const MEDIA_MESSAGE_FLAGS = MessageFlags.IsComponentsV2;

const ERROR_COLOR = 0xeb3434;
const WARNING_COLOR = 0xf7e139;
const ERROR_EMOJI = "<:oh:1209982840922570803>";

const CAPTION_MAX_CHARS = 280;
const CAPTION_MAX_LINES = 4;
const AUTHOR_MAX_CHARS = 20;

export interface MediaPlatformStyle {
  name: string;
  emote: string;
  color: number;
}

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/** Plain text from the platform: shortened, markdown escaped (mentions are off anyway). */
export const formatCaption = (caption: string) => {
  const lines = caption.trim().split(/\r?\n/).filter(Boolean);
  const clipped = lines.slice(0, CAPTION_MAX_LINES).join("\n");
  const text = truncate(clipped, CAPTION_MAX_CHARS);
  const ellipsis = lines.length > CAPTION_MAX_LINES && !text.endsWith("…") ? "…" : "";
  return escapeMarkdown(text + ellipsis);
};

export interface MediaMeta {
  author?: string;
  date?: Date;
  likes?: number;
  views?: number;
}

/** `<emote> @author · 11/12/2026 · ❤ 13.6k · 👁 1.6M`, missing fields skipped. */
export const formatMetaLine = (platform: MediaPlatformStyle, meta: MediaMeta = {}) => {
  const parts = [
    meta.author
      ? `@${escapeMarkdown(truncate(meta.author, AUTHOR_MAX_CHARS))}`
      : undefined,
    meta.date && !Number.isNaN(meta.date.getTime())
      ? time(meta.date, TimestampStyles.ShortDate)
      : undefined,
    meta.likes ? `❤ ${formatCompactNumber(meta.likes)}` : undefined,
    meta.views ? `👁 ${formatCompactNumber(meta.views)}` : undefined,
  ].filter(Boolean);

  // The emote stands in for the platform name when there is anything else to show
  return `-# ${platform.emote} ${parts.length > 0 ? parts.join(" · ") : platform.name}`;
};

const message = (container: ContainerBuilder) => ({
  components: [container],
  flags: MEDIA_MESSAGE_FLAGS as MessageFlags.IsComponentsV2,
  allowedMentions: { parse: [] as never[] },
});

const textBlock = (title: string, description?: string) =>
  new TextDisplayBuilder().setContent(description ? `${title}\n${description}` : title);

/** Progress states: "Fetching …", "In queue: #n". */
export const mediaStatusMessage = (
  platform: MediaPlatformStyle,
  title: string,
  description?: string
) =>
  message(
    new ContainerBuilder()
      .setAccentColor(platform.color)
      .addTextDisplayComponents(
        textBlock(`${platform.emote} **${title}**`, description && `-# ${description}`)
      )
  );

const contentParts = (content: TetraEmbedContent, fallbackTitle: string) =>
  typeof content === "string"
    ? { title: fallbackTitle, description: content }
    : { title: content.title || fallbackTitle, description: content.description };

export const mediaErrorMessage = (content: TetraEmbedContent) => {
  const { title, description } = contentParts(content, "Something went wrong");
  return message(
    new ContainerBuilder()
      .setAccentColor(ERROR_COLOR)
      .addTextDisplayComponents(textBlock(`${ERROR_EMOJI} **${title}**`, description))
  );
};

export const mediaWarningMessage = (content: TetraEmbedContent) => {
  const { title, description } = contentParts(content, "Hold on");
  return message(
    new ContainerBuilder()
      .setAccentColor(WARNING_COLOR)
      .addTextDisplayComponents(textBlock(`🟨 **${title}**`, description))
  );
};

/**
 * Final result: gallery of the uploaded files (referenced as `attachment://<name>`,
 * otherwise v2 messages don't show them), caption, one meta line, "Open original".
 */
export const mediaResultMessage = ({
  platform,
  attachmentNames,
  caption,
  meta,
  url,
}: {
  platform: MediaPlatformStyle;
  attachmentNames: string[];
  caption?: string;
  meta?: MediaMeta;
  url: string;
}) => {
  const container = new ContainerBuilder().setAccentColor(platform.color);

  if (attachmentNames.length > 0) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        attachmentNames.map((name) => (item) => item.setURL(`attachment://${name}`))
      )
    );
  }

  const captionText = caption?.trim() ? formatCaption(caption) : undefined;
  const body =
    attachmentNames.length === 0
      ? [captionText, "No media found in this post."].filter(Boolean).join("\n\n")
      : captionText;

  container.addTextDisplayComponents(
    textBlock(
      body ? `${body}\n${formatMetaLine(platform, meta)}` : formatMetaLine(platform, meta)
    )
  );

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Open original").setURL(url)
    )
  );

  return message(container);
};
