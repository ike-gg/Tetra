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

import { TETRA_ACCENT_COLOR } from "@/utils/embed-messages/tetra-embed";
import { formatCompactNumber } from "@/utils/format-compact-number";

// /media answers with Components v2 from its first reply on: a message can't drop the
// flag later, and switching a sent embed message to v2 by edit isn't something to rely on
export const MEDIA_MESSAGE_FLAGS = MessageFlags.IsComponentsV2;

const CAPTION_MAX_CHARS = 280;
const CAPTION_MAX_LINES = 4;
const AUTHOR_MAX_CHARS = 20;

export interface MediaPlatformStyle {
  name: string;
  emote?: string;
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

/**
 * `<emote> @author · 11/12/2026 · ❤ 13.6k · 👁 1.6M` (`Kick · @author · …` without an emote),
 * missing fields skipped.
 */
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

  // The platform's emoji stands in for its name; platforms without one show the name
  if (!platform.emote) return `-# ${[platform.name, ...parts].join(" · ")}`;
  return `-# ${platform.emote} ${parts.length > 0 ? parts.join(" · ") : platform.name}`;
};

const message = (container: ContainerBuilder) => ({
  components: [container],
  flags: MEDIA_MESSAGE_FLAGS as MessageFlags.IsComponentsV2,
  allowedMentions: { parse: [] as never[] },
});

const textBlock = (title: string, description?: string) =>
  new TextDisplayBuilder().setContent(description ? `${title}\n${description}` : title);

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
  // Neutral like every generic reply: no per-platform colours
  const container = new ContainerBuilder().setAccentColor(TETRA_ACCENT_COLOR);

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
      ? [captionText, "i couldn't find any media in this post"]
          .filter(Boolean)
          .join("\n\n")
      : captionText;

  container.addTextDisplayComponents(
    textBlock(
      body ? `${body}\n${formatMetaLine(platform, meta)}` : formatMetaLine(platform, meta)
    )
  );

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("open original").setURL(url)
    )
  );

  return message(container);
};
