import { ActionRowBuilder, ButtonBuilder } from "@discordjs/builders";
import {
  type BaseMessageOptions,
  type ButtonInteraction,
  ButtonStyle,
  CommandInteraction,
  DiscordAPIError,
  type InteractionEditReplyOptions,
  type InteractionReplyOptions,
  type InteractionUpdateOptions,
  isJSONEncodable,
  MessageFlags,
  type StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
} from "discord.js";

import SubmitErrorLogGenericButton from "@/interactions/buttons/generic/submit-error-log";

import { EmbeddedError } from "../../constants/errors";
import { Messages } from "../../constants/messages";
import { env } from "../../env";
import type { TetraClient } from "../../types";
import {
  bodyToComponents,
  isActionRow,
  type TopLevelComponent,
  V2_FLAG,
  withoutAttachmentMedia,
} from "../discord/components-v2";
import { feedbackPayload } from "../discord/feedback-payload";
import { TetraEmbed, type TetraEmbedContent } from "../embed-messages/tetra-embed";
import { createErrorCode, logErrorCode, reportWithCode } from "../error-code";

export class UnhandledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnhandledError";
  }
}

interface MessageState {
  body: TopLevelComponent[];
  rows: TopLevelComponent[];
}

const splitComponents = (components: readonly TopLevelComponent[]): MessageState => ({
  body: components.filter((component) => !isActionRow(component)),
  rows: components.filter(isActionRow),
});

const toJSONComponent = (component: unknown) =>
  (isJSONEncodable(component) ? component.toJSON() : component) as TopLevelComponent;

export class FeedbackManager {
  client: TetraClient;
  ephemeral: boolean;
  public relatedTask?: string;
  // What this manager last sent, so v1-style partial edits can be rebuilt without a fetch
  private state?: MessageState;

  constructor(
    public interaction:
      | CommandInteraction
      | ButtonInteraction
      | StringSelectMenuInteraction,
    options?: {
      ephemeral?: boolean;
    }
  ) {
    const ephemeral = options?.ephemeral || false;

    this.client = interaction.client as TetraClient;
    this.ephemeral = ephemeral;
  }

  /** See `feedbackPayload`. */
  static payload = feedbackPayload;

  /** The link to the panel that `panel()` replies carry. */
  static panelRows() {
    return [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("open panel")
          .setURL(`${env.FRONTEND_URL}/panel`)
      ),
    ];
  }

  /** The developers-log button row that every error reply carries. */
  static errorRows() {
    return [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        SubmitErrorLogGenericButton.metadata.getButton()
      ),
    ];
  }

  // Messages sent before the v2 switch (old buttons, up to the 24 h continuity window)
  // must stay embeds: a message can't be turned into v2 by an edit without clearing it
  private get isLegacyMessage() {
    if (this.interaction instanceof CommandInteraction) return false;
    return !this.interaction.message.flags.has(MessageFlags.IsComponentsV2);
  }

  private async currentState(): Promise<MessageState> {
    if (this.state) return this.state;

    if (!(this.interaction instanceof CommandInteraction)) {
      return splitComponents(
        this.interaction.message.components.map((component) => component.toJSON())
      );
    }

    if (this.interaction.replied || this.interaction.deferred) {
      const message = await this.interaction.fetchReply();
      return splitComponents(message.components.map((component) => component.toJSON()));
    }

    return { body: [], rows: [] };
  }

  private async deliver(content: BaseMessageOptions & { flags?: number }) {
    if (this.interaction.replied) {
      await this.interaction.editReply(content as InteractionEditReplyOptions);
    } else if (!(this.interaction instanceof CommandInteraction)) {
      await this.interaction.update(content as InteractionUpdateOptions);
    } else {
      await this.interaction.reply({
        ...content,
        flags: this.ephemeral
          ? (content.flags ?? 0) | MessageFlags.Ephemeral
          : content.flags,
      } as InteractionReplyOptions);
    }
  }

  /**
   * Takes v1-style options (embeds, action rows, files) and sends them as Components v2.
   * Like a v1 edit, what isn't given stays: no `embeds`/`content` keeps the current body,
   * no `components` keeps the current rows.
   */
  async sendMessage(content: BaseMessageOptions) {
    if (this.isLegacyMessage) {
      await this.deliver(content);
      return;
    }

    const hasBody = content.embeds !== undefined || typeof content.content === "string";
    const hasRows = content.components !== undefined;
    const current =
      hasBody && hasRows ? { body: [], rows: [] } : await this.currentState();

    let body = hasBody
      ? bodyToComponents(content.content, content.embeds ?? [])
      : current.body;

    // New files replace the old attachments, so gallery items pointing at others must go
    if (content.files !== undefined) {
      const names = new Set(
        content.files.map((file) =>
          typeof file === "object" && file && "name" in file ? String(file.name) : ""
        )
      );
      body = withoutAttachmentMedia(body, names);
    }

    const rows = hasRows ? (content.components ?? []).map(toJSONComponent) : current.rows;
    let files = content.files;

    // Discord rejects a v2 message without components (and empty Text Displays): an edit
    // that would empty it keeps the previous body, and its attachments with it
    if (body.length === 0 && rows.length === 0) {
      const previous = hasBody && hasRows ? await this.currentState() : current;
      body = previous.body;
      files = undefined;

      if (body.length === 0) {
        if (
          !(this.interaction instanceof CommandInteraction) &&
          !this.interaction.replied
        ) {
          await this.interaction.deferUpdate();
        }
        return;
      }
    }

    await this.deliver({
      components: [...body, ...rows],
      files,
      flags: V2_FLAG,
      allowedMentions: { parse: [] },
    });

    this.state = { body, rows };
  }

  async info(content: TetraEmbedContent) {
    await this.sendMessage({
      embeds: [TetraEmbed.info(content)],
    });
  }

  async success(content: TetraEmbedContent) {
    await this.sendMessage({
      embeds: [TetraEmbed.success(content)],
    });
  }

  async panel(content: TetraEmbedContent) {
    await this.sendMessage({
      embeds: [TetraEmbed.panel(content)],
      components: FeedbackManager.panelRows(),
    });
  }

  async attention(content: TetraEmbedContent) {
    await this.sendMessage({
      embeds: [TetraEmbed.attention(content)],
    });
  }

  async warning(content: TetraEmbedContent) {
    await this.sendMessage({
      embeds: [TetraEmbed.warning(content)],
    });
  }

  async media(content: TetraEmbedContent) {
    await this.sendMessage({
      embeds: [TetraEmbed.media(content)],
    });
  }

  async premium(content: TetraEmbedContent) {
    await this.sendMessage({
      embeds: [TetraEmbed.premium(content)],
    });
  }

  async handleError(error: unknown) {
    if (error instanceof EmbeddedError) {
      await this.error(error.embed);
    } else if (error instanceof UnhandledError) {
      await this.unhandledError(error);
    } else if (
      error instanceof TypeError ||
      error instanceof SyntaxError ||
      error instanceof ReferenceError ||
      error instanceof RangeError
    ) {
      await this.unhandledError(error);
    } else if (error instanceof DiscordAPIError) {
      // Missing Permissions
      if (error.code === 50013) {
        await this.botMissingPermissions();
        return;
      }
      await this.error(error.message);
    } else {
      await this.unhandledError(error);
    }
  }

  async error(content: TetraEmbedContent) {
    await this.sendMessage({
      embeds: [TetraEmbed.error(content)],
      components: FeedbackManager.errorRows(),
    });
  }

  async unhandledError(error: unknown) {
    const code = createErrorCode();
    logErrorCode(code, error);
    await this.error(`something broke on my side. ${reportWithCode(code)}`);
  }

  async updateComponents(
    components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[]
  ) {
    await this.sendMessage({
      components: components,
    });
  }

  /** Drops the rows (and, as before, the attachments); the text stays. */
  async removeComponents() {
    await this.sendMessage({
      components: [],
      files: [],
    });
  }

  async updateFiles(files: BaseMessageOptions["files"]) {
    await this.sendMessage({
      files: files,
    });
  }

  async working() {
    await this.sendMessage({
      embeds: [TetraEmbed.working(Messages.WORKING())],
    });
  }

  async interactionTimeout() {
    await this.error(Messages.INTERACTION_TIMEOUT);
  }

  async rateLimited() {
    await this.warning(Messages.RATE_LIMIT_EXCEEDED);
  }

  async notFoundEmotes() {
    await this.error(Messages.EMOTE_NOT_FOUND);
  }

  async missingPermissions() {
    await this.error(Messages.MISSING_PERMISSIONS);
  }

  async botMissingPermissions() {
    await this.error(Messages.BOT_MISSING_PERMISSIONS);
  }

  async invalidReference() {
    await this.error(Messages.INVALID_REFERENCE);
  }

  async notFoundFile() {
    await this.error("i couldn't find a file in that message");
  }
}
