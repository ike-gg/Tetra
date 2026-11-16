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

type ContainerChild = Extract<
  TopLevelComponent,
  { type: ComponentType.Container }
>["components"][number];

/** Drops blank and whitespace-only lines: every one of them is a line of height. */
export const tightText = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "")
    .join("\n");

/**
 * A title never gets its own line: `**Title** · first line`, the rest unchanged
 * (no separator when the line already starts with punctuation, e.g. `**Title**: …`).
 */
export const inlineTitle = (title: string, description: string) => {
  const [first = "", ...rest] = tightText(description).split("\n");
  const line = first.trimStart();
  if (!line) return `**${title}**`;
  const separator = /^[:;,.!?]/.test(line) ? "" : " · ";
  return [`**${title}**${separator}${line}`, ...rest].join("\n");
};

/** One embed → one Container: one text (title inline), thumbnail (Section), image. */
export const embedToContainer = (input: EmbedLike): TopLevelComponent => {
  const embed = toJSON(input);
  const children: ContainerChild[] = [];

  const title =
    embed.title && (embed.url ? `[${embed.title}](${embed.url})` : embed.title);
  const lines: string[] = [];
  if (embed.author?.name) lines.push(`-# ${embed.author.name}`);
  if (title && embed.description) lines.push(inlineTitle(title, embed.description));
  else if (title) lines.push(`**${title}**`);
  else if (embed.description) lines.push(tightText(embed.description));
  for (const field of embed.fields ?? []) {
    if (field.name === "​") {
      lines.push(field.value);
      continue;
    }
    // Embed field names are bold; names that already carry markdown keep their own
    const name = field.name.includes("**") ? field.name : `**${field.name}**`;
    lines.push(`${name}\n${field.value}`);
  }
  const footer = [
    embed.footer?.text,
    embed.timestamp
      ? `<t:${Math.floor(Date.parse(embed.timestamp) / 1000)}:f>`
      : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
  if (footer) lines.push(`-# ${footer}`);

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

  if (children.length === 0) children.push(text("​"));

  return {
    type: ComponentType.Container,
    ...(embed.color !== undefined ? { accent_color: embed.color } : {}),
    components: children,
  };
};

/** Neighbouring Text Displays become one: each component adds its own margin. */
const mergeTexts = (children: ContainerChild[]) =>
  children.reduce<ContainerChild[]>((merged, child) => {
    const last = merged.at(-1);
    if (
      last?.type === ComponentType.TextDisplay &&
      child.type === ComponentType.TextDisplay
    ) {
      merged[merged.length - 1] = text(`${last.content}\n${child.content}`);
    } else {
      merged.push(child);
    }
    return merged;
  }, []);

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
        components: mergeTexts([...last.components, ...container.components]),
      };
    } else {
      body.push(container);
    }
    previous = embed;
  }

  return body;
};

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
  body
    .map((component) =>
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
    )
    // A container left without children is rejected
    .filter(
      (component) =>
        component.type !== ComponentType.Container || component.components.length > 0
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
