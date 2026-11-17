import { and, eq, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";

import { TIME } from "@/constants/time";
import { db } from "@/db";
import { stvSyncConfigs } from "@/db/schema";
import { env } from "@/env";

import { addSyncedEmote, queueFilteredEmote } from "./add-synced-emote";
import { EventApiClient, type Subscription } from "./event-api/client";
import {
  activeEmoteSchema,
  type ChangeField,
  type Dispatch,
  removedEmoteSchema,
  SubscriptionType,
} from "./event-api/messages";
import { runForGuild } from "./job-queue";
import { removeSyncedEmote } from "./remove-synced-emote";
import { findRejectingFilter, readStoredSettings } from "./settings";
import { toSyncEmote } from "./sync-emote";

import { StvSyncConsole } from "#/loggers";

/** Changes with 7TV's timestamp are unique per add, so they can be remembered longer. */
const DEDUPE_TTL = 10 * TIME.MINUTE;
const DEDUPE_TTL_WITHOUT_TIMESTAMP = 30_000;

const connectionFieldsSchema = z.array(
  z.object({ key: z.string(), value: z.unknown() }).passthrough()
);

const describeError = (error: unknown) =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);

/**
 * The 7TV channel sync in the manager process: one EventAPI client for every guild,
 * one subscription per emote set and per 7TV user however many guilds share them.
 */
class StvSyncService {
  private client: EventApiClient | null = null;
  private readonly recentChanges = new Map<string, number>();

  get running() {
    return this.client !== null;
  }

  async start() {
    if (this.client) return;
    if (!env.SEVENTV_SYNC_ENABLED) {
      StvSyncConsole.info("disabled (SEVENTV_SYNC_ENABLED is off)");
      return;
    }

    this.client = new EventApiClient((dispatch) => this.handleDispatch(dispatch));
    this.client.start();
    await this.refresh();
  }

  /** Re-reads the enabled configs and moves the subscriptions to match. */
  async refresh() {
    if (!this.client) return;

    const configs = await db
      .select({
        emoteSetId: stvSyncConfigs.emoteSetId,
        stvUserId: stvSyncConfigs.stvUserId,
      })
      .from(stvSyncConfigs)
      .where(eq(stvSyncConfigs.enabled, true));

    const subscriptions: Subscription[] = [];
    const seen = new Set<string>();
    const add = (type: SubscriptionType, objectId: string) => {
      const key = `${type}:${objectId}`;
      if (seen.has(key)) return;
      seen.add(key);
      subscriptions.push({ type, objectId });
    };

    for (const config of configs) {
      if (config.emoteSetId) add(SubscriptionType.EmoteSetUpdate, config.emoteSetId);
      add(SubscriptionType.UserUpdate, config.stvUserId);
    }

    StvSyncConsole.info(
      `watching ${subscriptions.length} subscription(s) for ${configs.length} server(s)`
    );
    this.client.setSubscriptions(subscriptions);
  }

  /** For callers that can't wait (API routes after a change): errors are logged. */
  requestRefresh() {
    if (!this.client) return;
    this.refresh().catch((error) =>
      StvSyncConsole.error("refreshing subscriptions failed:", describeError(error))
    );
  }

  /** Connection state for the panel; `subscribed` only for a linked set. */
  status(emoteSetId?: string | null) {
    if (!this.client) {
      return {
        state: env.SEVENTV_SYNC_ENABLED ? ("stopped" as const) : ("disabled" as const),
        subscribed: false,
      };
    }
    return {
      state: this.client.status().state,
      subscribed: emoteSetId
        ? this.client.isSubscribed(SubscriptionType.EmoteSetUpdate, emoteSetId)
        : false,
    };
  }

  private isDuplicate(key: string, hasTimestamp: boolean) {
    const now = Date.now();
    for (const [cachedKey, expiresAt] of this.recentChanges) {
      if (expiresAt < now) this.recentChanges.delete(cachedKey);
    }
    if (this.recentChanges.has(key)) return true;
    this.recentChanges.set(
      key,
      now + (hasTimestamp ? DEDUPE_TTL : DEDUPE_TTL_WITHOUT_TIMESTAMP)
    );
    return false;
  }

  private handleDispatch(dispatch: Dispatch) {
    const run =
      dispatch.type === SubscriptionType.EmoteSetUpdate
        ? this.handleSetUpdate(dispatch.body)
        : dispatch.type === SubscriptionType.UserUpdate
          ? this.handleUserUpdate(dispatch.body)
          : Promise.resolve(StvSyncConsole.log(`dispatch type ${dispatch.type} ignored`));

    run.catch((error) =>
      StvSyncConsole.error(
        `handling ${dispatch.type} for ${dispatch.body.id} failed:`,
        describeError(error)
      )
    );
  }

  private async guildsSyncingSet(emoteSetId: string) {
    const rows = await db
      .select({ guildId: stvSyncConfigs.guildId })
      .from(stvSyncConfigs)
      .where(
        and(eq(stvSyncConfigs.emoteSetId, emoteSetId), eq(stvSyncConfigs.enabled, true))
      );
    return rows.map((row) => row.guildId);
  }

  private async handleSetUpdate(body: Dispatch["body"]) {
    const setId = body.id;
    const pushed = (body.pushed ?? []).filter((field) => field.key === "emotes");
    const pulled = (body.pulled ?? []).filter((field) => field.key === "emotes");
    const renamed = (body.updated ?? []).filter((field) => field.key === "emotes");

    if (renamed.length > 0) {
      StvSyncConsole.log(`set ${setId}: ${renamed.length} rename(s) ignored`);
    }
    if (pushed.length === 0 && pulled.length === 0) {
      StvSyncConsole.log(`set ${setId}: no emote added or removed`);
      return;
    }

    const guildIds = await this.guildsSyncingSet(setId);
    if (guildIds.length === 0) {
      StvSyncConsole.log(`set ${setId}: no server syncs it anymore`);
      return;
    }

    for (const field of pushed) this.handleAdded(setId, field, guildIds);
    for (const field of pulled) this.handleRemoved(setId, field, guildIds);
  }

  private handleAdded(setId: string, field: ChangeField, guildIds: string[]) {
    const parsed = activeEmoteSchema.safeParse(field.value);
    if (!parsed.success) {
      StvSyncConsole.warn(
        `set ${setId}: added emote with an unexpected shape skipped:`,
        String(JSON.stringify(field.value)).slice(0, 500)
      );
      return;
    }

    const emote = parsed.data;
    const timestamp = emote.timestamp ?? null;
    if (
      this.isDuplicate(`${setId}:${emote.id}:add:${timestamp ?? ""}`, timestamp !== null)
    ) {
      StvSyncConsole.log(`set ${setId}: duplicate add of ${emote.id} skipped`);
      return;
    }

    const sync = toSyncEmote(emote);
    if (!sync) {
      StvSyncConsole.warn(
        `set ${setId}: added emote ${emote.id} came without data, skipped`
      );
      return;
    }

    StvSyncConsole.info(
      `set ${setId}: ${sync.source.name} (${emote.id}) added, syncing to ${guildIds.length} server(s)`
    );

    for (const guildId of guildIds) {
      runForGuild(guildId, async () => {
        const config = await db.query.stvSyncConfigs.findFirst({
          where: eq(stvSyncConfigs.guildId, guildId),
        });
        // The link may have changed while the job waited
        if (!config?.enabled || config.emoteSetId !== setId) return;

        const settings = readStoredSettings(config.settings);
        const filter = findRejectingFilter(sync.filterable, settings);
        if (filter === "excluded") {
          StvSyncConsole.info(`[guild ${guildId}] ${emote.id} is excluded, skipped`);
          return;
        }
        if (filter) {
          await queueFilteredEmote(guildId, sync.source, filter);
          return;
        }
        await addSyncedEmote(guildId, sync.source, settings);
      }).catch((error) =>
        StvSyncConsole.error(
          `[guild ${guildId}] syncing ${emote.id} failed:`,
          describeError(error)
        )
      );
    }
  }

  private handleRemoved(setId: string, field: ChangeField, guildIds: string[]) {
    const parsed = removedEmoteSchema.safeParse(field.old_value);
    if (!parsed.success) {
      StvSyncConsole.warn(
        `set ${setId}: removed emote with an unexpected shape skipped:`,
        String(JSON.stringify(field.old_value)).slice(0, 500)
      );
      return;
    }

    const { id, timestamp } = parsed.data;
    if (this.isDuplicate(`${setId}:${id}:remove:${timestamp ?? ""}`, timestamp != null)) {
      StvSyncConsole.log(`set ${setId}: duplicate removal of ${id} skipped`);
      return;
    }

    StvSyncConsole.info(
      `set ${setId}: ${id} removed, syncing to ${guildIds.length} server(s)`
    );

    for (const guildId of guildIds) {
      runForGuild(guildId, async () => {
        const config = await db.query.stvSyncConfigs.findFirst({
          where: eq(stvSyncConfigs.guildId, guildId),
        });
        if (!config?.enabled || config.emoteSetId !== setId) return;
        await removeSyncedEmote(guildId, id);
      }).catch((error) =>
        StvSyncConsole.error(
          `[guild ${guildId}] removing ${id} failed:`,
          describeError(error)
        )
      );
    }
  }

  /** Active set switches arrive as `connections` changes; other user changes are ignored. */
  private async handleUserUpdate(body: Dispatch["body"]) {
    const userId = body.id;
    const connections = (body.updated ?? []).filter(
      (field) => field.key === "connections"
    );

    let newSetId: string | null | undefined;
    for (const connection of connections) {
      const fields = connectionFieldsSchema.safeParse(connection.value);
      if (!fields.success) continue;

      const setIdField = fields.data.find((field) => field.key === "emote_set_id");
      if (
        setIdField &&
        (typeof setIdField.value === "string" || setIdField.value === null)
      ) {
        newSetId = setIdField.value;
        break;
      }

      const setField = fields.data.find((field) => field.key === "emote_set");
      const fromSet = z.object({ id: z.string() }).nullable().safeParse(setField?.value);
      if (setField && fromSet.success) {
        newSetId = fromSet.data?.id ?? null;
        break;
      }
    }

    if (newSetId === undefined) {
      StvSyncConsole.log(`user ${userId}: update without an active set change ignored`);
      return;
    }

    if (this.isDuplicate(`${userId}:set:${newSetId}`, false)) return;

    const moved = await db
      .update(stvSyncConfigs)
      .set({ emoteSetId: newSetId, updatedAt: new Date() })
      .where(
        and(
          eq(stvSyncConfigs.stvUserId, userId),
          newSetId === null
            ? undefined
            : or(
                isNull(stvSyncConfigs.emoteSetId),
                ne(stvSyncConfigs.emoteSetId, newSetId)
              )
        )
      )
      .returning({ guildId: stvSyncConfigs.guildId });

    StvSyncConsole.info(
      `user ${userId}: active set is now ${newSetId ?? "none"}, moved ${moved.length} server(s)`
    );
    await this.refresh();
  }
}

export const stvSync = new StvSyncService();
