import {
  ackSchema,
  endOfStreamSchema,
  helloSchema,
  messageSchema,
  Op,
  type SubscriptionType,
} from "./messages";

import { StvSyncConsole } from "#/loggers";

const DEFAULT_HEARTBEAT_INTERVAL = 45_000;
const DEFAULT_SUBSCRIPTION_LIMIT = 500;
/** The server's heartbeat is the only liveness signal: 3 missed intervals = dead. */
const MISSED_HEARTBEATS = 3;
const HELLO_TIMEOUT = 15_000;

/** Internal close codes, never sent by the server. */
export const LocalCloseCode = {
  HeartbeatTimeout: -1,
  HelloTimeout: -2,
  SocketError: -3,
} as const;

export const subscriptionKey = (type: SubscriptionType | string, objectId: string) =>
  `${type}:${objectId}`;

export interface SocketHandlers {
  onReady: (socket: EventApiSocket) => void;
  onDispatch: (socket: EventApiSocket, payload: unknown) => void;
  onReconnectRequested: (socket: EventApiSocket) => void;
  /** Called exactly once, also when we closed the socket ourselves. */
  onClose: (socket: EventApiSocket, code: number, reason: string) => void;
}

let nextSocketId = 1;

/** One WebSocket connection to the EventAPI. Subscriptions don't survive it. */
export class EventApiSocket {
  readonly id = nextSocketId++;
  readonly subscribed = new Set<string>();
  readonly acked = new Set<string>();

  ready: boolean = false;
  readyAt = 0;
  subscriptionLimit = DEFAULT_SUBSCRIPTION_LIMIT;

  private heartbeatInterval = DEFAULT_HEARTBEAT_INTERVAL;
  private lastMessageAt = Date.now();
  private endOfStream: { code: number; message?: string } | undefined;
  private closed: boolean = false;
  private watchdog: ReturnType<typeof setInterval> | undefined;
  private helloTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly ws: WebSocket;

  constructor(
    url: string,
    private readonly handlers: SocketHandlers
  ) {
    this.log("connecting");
    this.ws = new WebSocket(url);
    this.ws.addEventListener("message", (event) => this.onMessage(event.data));
    this.ws.addEventListener("close", (event) =>
      this.finish(
        this.endOfStream?.code ?? event.code,
        this.endOfStream?.message ?? event.reason
      )
    );
    this.ws.addEventListener("error", () => {
      // A `close` event follows; only note it
      this.log("socket error");
    });

    this.helloTimer = setTimeout(() => {
      if (!this.ready) this.kill(LocalCloseCode.HelloTimeout, "no hello");
    }, HELLO_TIMEOUT);
    this.helloTimer.unref();
  }

  get isOpen() {
    return !this.closed;
  }

  subscribe(type: SubscriptionType, objectId: string) {
    const key = subscriptionKey(type, objectId);
    // Subscribing twice closes the connection with 4009
    if (this.closed || !this.ready || this.subscribed.has(key)) return;

    this.subscribed.add(key);
    this.send({ op: Op.Subscribe, d: { type, condition: { object_id: objectId } } });
    this.log(`subscribe ${key}`);
  }

  /** Closes the socket; `onClose` runs right away, without waiting for the server. */
  close(reason: string) {
    this.kill(1000, reason);
  }

  private kill(code: number, reason: string) {
    if (this.closed) return;
    try {
      this.ws.close(1000, reason);
    } catch {
      // Already closing
    }
    this.finish(code, reason);
  }

  private finish(code: number, reason: string) {
    if (this.closed) return;
    this.closed = true;
    this.ready = false;
    clearInterval(this.watchdog);
    clearTimeout(this.helloTimer);
    this.log(`closed (${code}${reason ? ` ${reason}` : ""})`);
    this.handlers.onClose(this, code, reason);
  }

  private send(payload: unknown) {
    try {
      this.ws.send(JSON.stringify(payload));
    } catch (error) {
      this.log("send failed", error instanceof Error ? error.message : error);
      this.kill(LocalCloseCode.SocketError, "send failed");
    }
  }

  private onMessage(raw: unknown) {
    this.lastMessageAt = Date.now();
    if (this.closed) return;

    let json: unknown;
    try {
      json = JSON.parse(
        typeof raw === "string" ? raw : Buffer.from(raw as ArrayBuffer).toString()
      );
    } catch {
      this.log("non-JSON message skipped");
      return;
    }

    const message = messageSchema.safeParse(json);
    if (!message.success) {
      this.log("unexpected message shape skipped", JSON.stringify(json).slice(0, 500));
      return;
    }

    const { op, d } = message.data;

    switch (op) {
      case Op.Hello: {
        const hello = helloSchema.safeParse(d);
        if (hello.success) {
          this.heartbeatInterval = hello.data.heartbeat_interval;
          this.subscriptionLimit =
            hello.data.subscription_limit ?? DEFAULT_SUBSCRIPTION_LIMIT;
        } else {
          this.log("hello with an unexpected shape, using defaults");
        }
        this.ready = true;
        this.readyAt = Date.now();
        clearTimeout(this.helloTimer);
        this.startWatchdog();
        this.log(
          `hello (heartbeat ${this.heartbeatInterval} ms, limit ${this.subscriptionLimit}, session ${hello.data?.session_id ?? "?"})`
        );
        this.handlers.onReady(this);
        return;
      }
      case Op.Heartbeat:
        return;
      case Op.Dispatch:
        this.handlers.onDispatch(this, d);
        return;
      case Op.Reconnect:
        this.log("server asked to reconnect");
        this.handlers.onReconnectRequested(this);
        return;
      case Op.Ack: {
        const ack = ackSchema.safeParse(d);
        const objectId = ack.data?.data?.condition?.object_id;
        if (
          ack.success &&
          ack.data.command === "SUBSCRIBE" &&
          ack.data.data?.type &&
          objectId
        ) {
          const key = subscriptionKey(ack.data.data.type, objectId);
          this.acked.add(key);
          this.log(`subscribed ${key}`);
        } else {
          this.log("ack", JSON.stringify(d).slice(0, 300));
        }
        return;
      }
      case Op.Error:
        StvSyncConsole.warn(
          `[socket ${this.id}] error from server:`,
          JSON.stringify(d).slice(0, 500)
        );
        return;
      case Op.EndOfStream: {
        // The close frame carried 1008 in tests; the real code is only here
        const end = endOfStreamSchema.safeParse(d);
        if (end.success) this.endOfStream = end.data;
        this.log("end of stream", JSON.stringify(d).slice(0, 300));
        return;
      }
      default:
        this.log(`unhandled op ${op}`, JSON.stringify(d).slice(0, 300));
    }
  }

  private startWatchdog() {
    clearInterval(this.watchdog);
    this.watchdog = setInterval(() => {
      if (Date.now() - this.lastMessageAt > this.heartbeatInterval * MISSED_HEARTBEATS) {
        StvSyncConsole.warn(`[socket ${this.id}] no heartbeat for 3 intervals`);
        this.kill(LocalCloseCode.HeartbeatTimeout, "heartbeat timeout");
      }
    }, this.heartbeatInterval);
    this.watchdog.unref();
  }

  private log(...args: unknown[]) {
    StvSyncConsole.log(`[socket ${this.id}]`, ...args);
  }
}
