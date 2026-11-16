import {
  type APIEmbed,
  type APIMessageTopLevelComponent,
  ComponentType,
  isJSONEncodable,
  type JSONEncodable,
  MessageFlags,
} from "discord.js";

/**
 * Components v2 helpers for `FeedbackManager`. A message that has the v2 flag keeps it
 * forever and can't carry `content`/`embeds`, so every message the manager creates is v2
 * from its first reply and embeds callers pass in are converted here, keeping their text,
 * fields, images and colour.
 */

export type TopLevelComponent = APIMessageTopLevelComponent;
type EmbedLike = APIEmbed | JSONEncodable<APIEmbed>;

export const V2_FLAG = MessageFlags.IsComponentsV2;

const toJSON = <T>(value: T | JSONEncodable<T>): T =>
  isJSONEncodable(value) ? value.toJSON() : value;

const text = (content: string) => ({ type: ComponentType.TextDisplay as const, content });

/** One embed → one Container: title, description, fields, thumbnail (Section), image. */
export const embedToContainer = (input: EmbedLike): TopLevelComponent => {
  const embed = toJSON(input);
  const children: Extract<
    TopLevelComponent,
    { type: ComponentType.Container }
  >["components"] = [];

  const lines: string[] = [];
  if (embed.author?.name) lines.push(`-# ${embed.author.name}`);
  if (embed.title) {
    lines.push(embed.url ? `**[${embed.title}](${embed.url})**` : `**${embed.title}**`);
  }
  if (embed.description) lines.push(embed.description);
  for (const field of embed.fields ?? []) {
    if (field.name === "​") {
      lines.push(field.value);
      continue;
    }
    // Embed field names are bold; names that already carry markdown keep their own
    const name = field.name.includes("**") ? field.name : `**${field.name}**`;
    lines.push(`${name}\n${field.value}`);
  }

  const body = lines.join("\n");
  const thumbnail = embed.thumbnail?.url;

  if (body && thumbnail) {
    children.push({
      type: ComponentType.Section,
      components: [text(body)],
      accessory: { type: ComponentType.Thumbnail, media: { url: thumbnail } },
    });
  } else if (body) {
    children.push(text(body));
  }

  if (embed.image?.url) {
    children.push({
      type: ComponentType.MediaGallery,
      items: [{ media: { url: embed.image.url } }],
    });
  }

  const footer = [
    embed.footer?.text,
    embed.timestamp
      ? `<t:${Math.floor(Date.parse(embed.timestamp) / 1000)}:f>`
      : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  if (footer) children.push(text(`-# ${footer}`));

  if (children.length === 0) children.push(text("​"));

  return {
    type: ComponentType.Container,
    ...(embed.color !== undefined ? { accent_color: embed.color } : {}),
    components: children,
  };
};

/**
 * `content` + embeds → the message body (top-level components before the rows).
 * Consecutive untitled embeds of one colour (e.g. the 5 emote previews of a search page)
 * share one container: one container each would push a page close to the 40-component
 * limit.
 */
export const bodyToComponents = (
  content: string | null | undefined,
  embeds: readonly EmbedLike[]
): TopLevelComponent[] => {
  const body: TopLevelComponent[] = content ? [text(content)] : [];
  let previous: APIEmbed | undefined;

  for (const input of embeds) {
    const embed = toJSON(input);
    const container = embedToContainer(embed);
    const last = body.at(-1);

    if (
      previous &&
      !previous.title &&
      !embed.title &&
      previous.color === embed.color &&
      last?.type === ComponentType.Container &&
      container.type === ComponentType.Container
    ) {
      body[body.length - 1] = {
        ...last,
        components: [...last.components, ...container.components],
      };
    } else {
      body.push(container);
    }
    previous = embed;
  }

  return body;
};

/** A v2 message needs at least one component; an edit that empties it keeps a blank line. */
export const nonEmpty = (components: TopLevelComponent[]): TopLevelComponent[] =>
  components.length > 0 ? components : [text("\u200b")];

export const isActionRow = (component: { type: ComponentType }) =>
  component.type === ComponentType.ActionRow;

/**
 * Drops galleries that point at uploads not in `keep`: an edit with new files replaces the
 * attachments, and a reference to a missing one is rejected.
 */
export const withoutAttachmentMedia = (
  body: TopLevelComponent[],
  keep: ReadonlySet<string> = new Set()
): TopLevelComponent[] =>
  body.map((component) =>
    component.type === ComponentType.Container
      ? {
          ...component,
          components: component.components.filter(
            (child) =>
              child.type !== ComponentType.MediaGallery ||
              !child.items.some(
                (item) =>
                  item.media.url.startsWith("attachment://") &&
                  !keep.has(item.media.url.slice("attachment://".length))
              )
          ),
        }
      : component
  );

/** All visible text of a v2 message, e.g. to forward an error reply to the error log. */
export const collectText = (components: readonly { toJSON?: () => unknown }[]) => {
  const parts: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const value = node as { type?: number; content?: string; components?: unknown[] };
    if (value.type === ComponentType.TextDisplay && value.content)
      parts.push(value.content);
    for (const child of value.components ?? []) walk(child);
  };
  for (const component of components) walk(component.toJSON?.() ?? component);
  return parts.join("\n");
};
