import { TIME } from "@/constants/time";

import {
  CLIENT_BUG_CODES,
  CloseCode,
  type Dispatch,
  dispatchSchema,
  type SubscriptionType,
} from "./messages";
import { EventApiSocket, subscriptionKey } from "./socket";

import { StvSyncConsole } from "#/loggers";

const EVENT_API_URL = "wss://events.7tv.io/v3";

/** How long the old connection stays open after its replacement subscribed. */
const HANDOVER_GRACE = 5_000;
const BACKOFF_BASE = 1_000;
const BACKOFF_MAX = TIME.MINUTE;
/** A connection that lived this long resets the backoff. */
const HEALTHY_AFTER = TIME.MINUTE;
const MAINTENANCE_DELAY = 5 * TIME.MINUTE;
const CLIENT_BUG_DELAY = 5 * TIME.MINUTE;
/** Raw dispatches are logged for the experiment, cut to this length. */
const RAW_LOG_LIMIT = 4_000;

export interface Subscription {
  type: SubscriptionType;
  objectId: string;
}

/** `idle`: running, but no server syncs a channel, so there is no connection. */
export type ConnectionState =
  | "stopped"
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting";

const jitter = (ms: number) => Math.round(ms * (0.5 + Math.random()));

/**
 * A group of subscriptions that live on one connection (500 per connection). Its socket
 * is replaced on the server's hourly Reconnect and after failures; the new socket
 * subscribes everything again, since the server can't resume.
 */
class Slot {
  readonly keys = new Map<string, Subscription>();
  socket: EventApiSocket | null = null;
  /** A socket that takes over once it is ready (initial connect, reconnect, handover). */
  pending: EventApiSocket | null = null;
  reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  failures = 0;

  constructor(readonly id: number) {}

  /** Keys that count against the connection limit, including stale subscriptions. */
  get load() {
    const keys = new Set(this.keys.keys());
    for (const key of this.socket?.subscribed ?? []) keys.add(key);
    return keys.size;
  }

  get limit() {
    return this.socket?.subscriptionLimit ?? 500;
  }
}

/**
 * EventAPI client: keeps the wanted subscriptions on as few connections as possible and
 * hands every dispatch for a wanted subscription to `onDispatch`. The same change can
 * arrive twice while two connections overlap; the caller dedupes.
 */
export class EventApiClient {
  private readonly wanted = new Map<string, Subscription>();
  private readonly slots: Slot[] = [];
  private nextSlotId = 1;
  private started: boolean = false;

  constructor(private readonly onDispatch: (dispatch: Dispatch) => void) {}

  start() {
    this.started = true;
    StvSyncConsole.info("EventAPI client started");
    this.reconcile();
  }

  stop() {
    this.started = false;
    for (const slot of this.slots.splice(0)) this.closeSlot(slot);
  }

  setSubscriptions(subscriptions: Subscription[]) {
    this.wanted.clear();
    for (const subscription of subscriptions) {
      this.wanted.set(
        subscriptionKey(subscription.type, subscription.objectId),
        subscription
      );
    }
    this.reconcile();
  }

  /** Whether the server acknowledged this subscription on a live connection. */
  isSubscribed(type: SubscriptionType, objectId: string) {
    const key = subscriptionKey(type, objectId);
    return this.slots.some((slot) => slot.socket?.isOpen && slot.socket.acked.has(key));
  }

  status(): { state: ConnectionState; connections: number; subscriptions: number } {
    if (!this.started) return { state: "stopped", connections: 0, subscriptions: 0 };

    const live = this.slots.filter((slot) => slot.socket?.ready);
    const state: ConnectionState =
      this.slots.length === 0
        ? "idle"
        : live.length === this.slots.length
          ? "connected"
          : live.length === 0 && this.slots.every((slot) => slot.failures === 0)
            ? "connecting"
            : "reconnecting";

    return {
      state,
      connections: live.length,
      subscriptions: live.reduce((sum, slot) => sum + (slot.socket?.acked.size ?? 0), 0),
    };
  }

  private reconcile() {
    if (!this.started) return;

    // Unwanted keys leave their slot; the server keeps sending their events until the
    // connection is replaced (there is no verified unsubscribe), and they are ignored.
    for (const slot of this.slots) {
      for (const key of slot.keys.keys()) {
        if (!this.wanted.has(key)) slot.keys.delete(key);
      }
    }

    for (const [key, subscription] of this.wanted) {
      if (this.slots.some((slot) => slot.keys.has(key))) continue;

      // Prefer a slot whose socket is already subscribed (re-wanted after a removal)
      const slot =
        this.slots.find((candidate) => candidate.socket?.subscribed.has(key)) ??
        this.slots.find((candidate) => candidate.load < candidate.limit) ??
        this.addSlot();
      slot.keys.set(key, subscription);
    }

    for (const slot of [...this.slots]) {
      if (slot.keys.size === 0) {
        this.slots.splice(this.slots.indexOf(slot), 1);
        this.closeSlot(slot);
        StvSyncConsole.info(`connection ${slot.id} has nothing to watch, closed`);
        continue;
      }

      if (!slot.socket && !slot.pending && !slot.reconnectTimer) this.connect(slot);
      if (slot.socket?.ready) this.subscribeAll(slot, slot.socket);
    }
  }

  private addSlot() {
    const slot = new Slot(this.nextSlotId++);
    this.slots.push(slot);
    return slot;
  }

  private closeSlot(slot: Slot) {
    clearTimeout(slot.reconnectTimer);
    slot.reconnectTimer = undefined;
    const { socket, pending } = slot;
    slot.socket = null;
    slot.pending = null;
    socket?.close("unused");
    pending?.close("unused");
  }

  private subscribeAll(slot: Slot, socket: EventApiSocket) {
    for (const { type, objectId } of slot.keys.values()) socket.subscribe(type, objectId);
  }

  private connect(slot: Slot) {
    slot.pending = new EventApiSocket(EVENT_API_URL, {
      onReady: (socket) => {
        if (socket !== slot.pending) return;
        this.subscribeAll(slot, socket);

        const previous = slot.socket;
        slot.socket = socket;
        slot.pending = null;
        // Overlap: both connections deliver events until the old one closes
        if (previous) {
          setTimeout(() => previous.close("replaced"), HANDOVER_GRACE).unref();
        }
      },
      onDispatch: (_socket, payload) => this.handleDispatch(payload),
      onReconnectRequested: (socket) => {
        // The server closes this connection soon; open the next one first
        if (socket === slot.socket && !slot.pending && this.isActive(slot)) {
          this.connect(slot);
        }
      },
      onClose: (socket, code, reason) => {
        const wasCurrent = socket === slot.socket;
        const wasPending = socket === slot.pending;
        if (wasCurrent) slot.socket = null;
        if (wasPending) slot.pending = null;
        if (!wasCurrent && !wasPending) return;

        if (socket.readyAt && Date.now() - socket.readyAt > HEALTHY_AFTER) {
          slot.failures = 0;
        }

        // The other socket of the slot (handover in progress) carries on
        if (slot.socket || slot.pending) return;
        this.scheduleReconnect(slot, code, reason);
      },
    });
  }

  private isActive(slot: Slot) {
    return this.started && this.slots.includes(slot) && slot.keys.size > 0;
  }

  private scheduleReconnect(slot: Slot, code: number, reason: string) {
    if (!this.isActive(slot)) return;

    let delay: number;
    if (code === CloseCode.Maintenance) {
      delay = MAINTENANCE_DELAY + jitter(MAINTENANCE_DELAY / 2);
      StvSyncConsole.warn(
        `7TV is in maintenance, reconnecting in ${Math.round(delay / 1000)} s`
      );
    } else if (CLIENT_BUG_CODES.includes(code)) {
      delay = CLIENT_BUG_DELAY + jitter(CLIENT_BUG_DELAY / 2);
      StvSyncConsole.error(
        `connection ${slot.id} closed with ${code} (${reason}), which points at a client bug. reconnecting in ${Math.round(delay / 1000)} s`
      );
    } else {
      delay = jitter(Math.min(BACKOFF_MAX, BACKOFF_BASE * 2 ** slot.failures));
      StvSyncConsole.warn(
        `connection ${slot.id} closed (${code}${reason ? ` ${reason}` : ""}), reconnecting in ${Math.round(delay / 1000)} s`
      );
    }
    slot.failures++;

    slot.reconnectTimer = setTimeout(() => {
      slot.reconnectTimer = undefined;
      if (this.isActive(slot) && !slot.socket && !slot.pending) this.connect(slot);
    }, delay);
    slot.reconnectTimer.unref();
  }

  private handleDispatch(payload: unknown) {
    const raw = String(JSON.stringify(payload));
    StvSyncConsole.log(
      "dispatch",
      raw.length > RAW_LOG_LIMIT
        ? `${raw.slice(0, RAW_LOG_LIMIT)}… (${raw.length} chars)`
        : raw
    );

    const parsed = dispatchSchema.safeParse(payload);
    if (!parsed.success) {
      StvSyncConsole.warn(
        "dispatch with an unexpected shape skipped:",
        parsed.error.issues
          .slice(0, 3)
          .map((issue) => `${issue.path.join(".")} ${issue.message}`)
          .join("; ")
      );
      return;
    }

    const key = subscriptionKey(parsed.data.type, parsed.data.body.id);
    if (!this.wanted.has(key)) {
      StvSyncConsole.log(`dispatch for ${key} ignored, not wanted anymore`);
      return;
    }

    try {
      this.onDispatch(parsed.data);
    } catch (error) {
      StvSyncConsole.error(
        `dispatch handler failed for ${key}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
