import type { Redis } from "ioredis";

import {
  ACQUIRE_SCRIPT,
  DELETE_IF_OWNER_SCRIPT,
  REFRESH_IF_OWNER_SCRIPT,
} from "./scripts";

/** Redis is down or too slow: /media fails closed instead of running unbounded. */
export class MediaQueueUnavailableError extends Error {
  constructor() {
    super("Media queue unavailable");
    this.name = "MediaQueueUnavailableError";
  }
}

/** The ticket was still waiting at its deadline. */
export class MediaQueueWaitTimeoutError extends Error {
  constructor() {
    super("Media queue wait limit reached");
    this.name = "MediaQueueWaitTimeoutError";
  }
}

/** The job ran past `jobTimeoutMs` (its signal was aborted). */
export class MediaJobTimeoutError extends Error {
  constructor() {
    super("Media job timed out");
    this.name = "MediaJobTimeoutError";
  }
}

/** The lock expired or was taken over while the job ran (its signal was aborted). */
export class MediaLockLostError extends Error {
  constructor() {
    super("Media queue lock lost");
    this.name = "MediaLockLostError";
  }
}

export interface MediaQueueTimings {
  lockTtlMs: number;
  lockHeartbeatMs: number;
  ticketTtlMs: number;
  ticketHeartbeatMs: number;
  userTtlMs: number;
  pollMs: number;
  commandTimeoutMs: number;
}

export const DEFAULT_TIMINGS: MediaQueueTimings = {
  lockTtlMs: 30_000,
  lockHeartbeatMs: 10_000,
  ticketTtlMs: 15_000,
  ticketHeartbeatMs: 5_000,
  userTtlMs: 30_000,
  pollMs: 3_000,
  commandTimeoutMs: 3_000,
};

export interface RunOptions {
  /** Waiting stops here (epoch ms) with `MediaQueueWaitTimeoutError`. */
  deadline: number;
  jobTimeoutMs: number;
  /** Refreshes the key taken with `claimUser` while the ticket lives. */
  userId?: string;
  /** Called on every check while waiting; 1 = next in line. */
  onPosition?: (position: number) => unknown;
}

/** Single place for the order: premium priority would lower the score here. */
export const ticketScore = (enqueuedAt: number) => enqueuedAt;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Global FIFO with concurrency 1 across every process that shares the Redis.
 * Keys: `<prefix>:tickets` (zset, score = `ticketScore`), `<prefix>:alive:<ticket>`
 * (TTL heartbeat of a waiting ticket), `<prefix>:lock` (running ticket, TTL heartbeat),
 * `<prefix>:user:<id>` (one request per user); channel `<prefix>:released`.
 */
export class MediaQueue {
  private readonly timings: MediaQueueTimings;
  private subscriber?: Redis;
  private readonly wakers = new Set<() => void>();

  constructor(
    private readonly redis: Redis,
    private readonly createSubscriber: () => Redis,
    private readonly prefix = "media-queue",
    timings: Partial<MediaQueueTimings> = {}
  ) {
    this.timings = { ...DEFAULT_TIMINGS, ...timings };
  }

  private get keys() {
    return {
      tickets: `${this.prefix}:tickets`,
      lock: `${this.prefix}:lock`,
      alivePrefix: `${this.prefix}:alive:`,
      channel: `${this.prefix}:released`,
      user: (userId: string) => `${this.prefix}:user:${userId}`,
    };
  }

  // ioredis queues commands while disconnected; a bounded wait turns that into "down"
  private async call<T>(run: () => Promise<T>): Promise<T> {
    if (this.redis.status !== "ready") throw new MediaQueueUnavailableError();

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        run(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new MediaQueueUnavailableError()),
            this.timings.commandTimeoutMs
          );
        }),
      ]);
    } catch (error) {
      if (error instanceof MediaQueueUnavailableError) throw error;
      throw new MediaQueueUnavailableError();
    } finally {
      clearTimeout(timer);
    }
  }

  /** `false` when the user already has a request waiting or running. */
  async claimUser(userId: string, ticket: string): Promise<boolean> {
    const result = await this.call(() =>
      this.redis.set(this.keys.user(userId), ticket, "PX", this.timings.userTtlMs, "NX")
    );
    return result === "OK";
  }

  async releaseUser(userId: string, ticket: string) {
    await this.call(() =>
      this.redis.eval(DELETE_IF_OWNER_SCRIPT, 1, this.keys.user(userId), ticket)
    );
  }

  /** Waits for the ticket's turn, runs `job` alone, always cleans up. */
  async run<T>(
    ticket: string,
    options: RunOptions,
    job: (signal: AbortSignal) => Promise<T>
  ): Promise<T> {
    const { tickets, lock, alivePrefix, channel } = this.keys;
    const score = ticketScore(Date.now());
    let waiting = true;
    let acquired = false;

    const enqueue = () =>
      this.call(() =>
        this.redis
          .multi()
          .set(`${alivePrefix}${ticket}`, "1", "PX", this.timings.ticketTtlMs)
          .zadd(tickets, "NX", score, ticket)
          .exec()
      );

    const refreshUser = () =>
      options.userId
        ? this.redis.eval(
            REFRESH_IF_OWNER_SCRIPT,
            1,
            this.keys.user(options.userId),
            ticket,
            this.timings.userTtlMs
          )
        : undefined;

    // Heartbeat failures are ignored: a missed beat only means the key may expire,
    // which the acquire loop (re-enqueue) and the lock heartbeat (abort) handle
    const ticketHeartbeat = setInterval(() => {
      void Promise.allSettled([waiting ? enqueue() : undefined, refreshUser()]);
    }, this.timings.ticketHeartbeatMs);

    const controller = new AbortController();
    let lockHeartbeat: ReturnType<typeof setInterval> | undefined;
    let jobTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      await enqueue();
      this.ensureSubscriber();

      for (;;) {
        if (Date.now() >= options.deadline) throw new MediaQueueWaitTimeoutError();

        const position = Number(
          await this.call(() =>
            this.redis.eval(
              ACQUIRE_SCRIPT,
              2,
              tickets,
              lock,
              ticket,
              this.timings.lockTtlMs,
              alivePrefix
            )
          )
        );

        if (position === 0) break;
        if (position < 0) {
          await enqueue();
          continue;
        }

        try {
          await options.onPosition?.(position);
        } catch {
          // Feedback is best effort; the place in the queue matters more
        }

        await this.waitForWake(
          Math.max(0, Math.min(this.timings.pollMs, options.deadline - Date.now()))
        );
      }

      waiting = false;
      acquired = true;

      lockHeartbeat = setInterval(() => {
        this.redis
          .eval(REFRESH_IF_OWNER_SCRIPT, 1, lock, ticket, this.timings.lockTtlMs)
          .then((refreshed) => {
            if (Number(refreshed) === 0) controller.abort(new MediaLockLostError());
          })
          .catch(() => undefined);
      }, this.timings.lockHeartbeatMs);

      jobTimer = setTimeout(
        () => controller.abort(new MediaJobTimeoutError()),
        options.jobTimeoutMs
      );

      const aborted = new Promise<never>((_, reject) => {
        controller.signal.addEventListener(
          "abort",
          () => reject(controller.signal.reason),
          { once: true }
        );
      });

      return await Promise.race([job(controller.signal), aborted]);
    } finally {
      clearInterval(ticketHeartbeat);
      clearInterval(lockHeartbeat);
      clearTimeout(jobTimer);
      // Kills tools a finished or failed job may have left running
      controller.abort();

      // Best effort: whatever is left expires through its TTL
      await this.call(async () => {
        const pipeline = this.redis
          .multi()
          .zrem(tickets, ticket)
          .del(`${alivePrefix}${ticket}`);
        if (acquired) pipeline.eval(DELETE_IF_OWNER_SCRIPT, 1, lock, ticket);
        return pipeline.publish(channel, ticket).exec();
      }).catch(() => undefined);
    }
  }

  // One subscriber connection per process (a subscribed ioredis client can't run
  // other commands); if it fails, waiters still poll every `pollMs`
  private ensureSubscriber() {
    if (this.subscriber) return;

    const subscriber = this.createSubscriber();
    this.subscriber = subscriber;
    subscriber.on("error", () => undefined);
    subscriber.on("message", () => {
      for (const wake of this.wakers) wake();
    });
    subscriber.subscribe(this.keys.channel).catch(() => undefined);
  }

  private async waitForWake(timeoutMs: number) {
    let wake: (() => void) | undefined;
    await Promise.race([
      sleep(timeoutMs),
      new Promise<void>((resolve) => {
        wake = resolve;
        this.wakers.add(resolve);
      }),
    ]);
    if (wake) this.wakers.delete(wake);
  }

  async close() {
    await this.subscriber?.quit().catch(() => undefined);
    this.subscriber = undefined;
  }
}
