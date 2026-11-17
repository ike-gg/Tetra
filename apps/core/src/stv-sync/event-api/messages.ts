import { z } from "zod";

/** EventAPI v3 opcodes (see docs/core/7tv-sync.md). */
export const Op = {
  Dispatch: 0,
  Hello: 1,
  Heartbeat: 2,
  Reconnect: 4,
  Ack: 5,
  Error: 6,
  EndOfStream: 7,
  Subscribe: 35,
} as const;

export const SubscriptionType = {
  EmoteSetUpdate: "emote_set.update",
  UserUpdate: "user.update",
} as const;

export type SubscriptionType = (typeof SubscriptionType)[keyof typeof SubscriptionType];

export const messageSchema = z.object({
  op: z.number(),
  t: z.number().optional(),
  d: z.unknown(),
});

export const helloSchema = z.object({
  heartbeat_interval: z.number().positive(),
  session_id: z.string().optional(),
  subscription_limit: z.number().optional(),
});

export const endOfStreamSchema = z.object({
  code: z.number(),
  message: z.string().optional(),
});

export const ackSchema = z.object({
  command: z.string(),
  data: z
    .object({
      type: z.string().optional(),
      condition: z.object({ object_id: z.string().optional() }).passthrough().optional(),
    })
    .passthrough()
    .optional(),
});

const changeFieldSchema: z.ZodType<ChangeField> = z.lazy(() =>
  z
    .object({
      key: z.string(),
      index: z.number().nullish(),
      nested: z.boolean().nullish(),
      type: z.string().nullish(),
      old_value: z.unknown(),
      value: z.unknown(),
    })
    .passthrough()
);

export interface ChangeField {
  key: string;
  index?: number | null;
  nested?: boolean | null;
  type?: string | null;
  old_value?: unknown;
  value?: unknown;
}

export const dispatchSchema = z.object({
  type: z.string(),
  body: z
    .object({
      id: z.string(),
      kind: z.number().optional(),
      pushed: z.array(changeFieldSchema).nullish(),
      pulled: z.array(changeFieldSchema).nullish(),
      updated: z.array(changeFieldSchema).nullish(),
    })
    .passthrough(),
});

export type Dispatch = z.infer<typeof dispatchSchema>;

/** An emote as it sits in a set: `name` is the set's alias, `flags` the per-set flags. */
export const activeEmoteSchema = z.object({
  id: z.string(),
  name: z.string(),
  flags: z.number().nullish(),
  timestamp: z.number().nullish(),
  data: z
    .object({
      id: z.string(),
      name: z.string(),
      flags: z.number().nullish(),
      animated: z.boolean(),
      owner: z.object({ id: z.string(), username: z.string() }).passthrough().nullish(),
      host: z.object({
        url: z.string(),
        files: z
          .array(
            z
              .object({ name: z.string(), width: z.number(), height: z.number() })
              .passthrough()
          )
          .nullish(),
      }),
    })
    .passthrough()
    .nullish(),
});

export type ActiveEmote = z.infer<typeof activeEmoteSchema>;

/** Only the id is needed for a removal; `data` is null when the emote was deleted on 7TV. */
export const removedEmoteSchema = z.object({
  id: z.string(),
  /** The alias in the set; only for the activity log. */
  name: z.string().nullish(),
  timestamp: z.number().nullish(),
  // Null when the emote itself was deleted from 7TV
  data: z.object({ animated: z.boolean().nullish() }).nullish(),
});

/** Active emote flags (per set). */
export const ACTIVE_EMOTE_FLAG_ZERO_WIDTH = 1;
/** Emote data flags. */
export const EMOTE_FLAG_ZERO_WIDTH = 1 << 8;
/** 7TV calls it "sexual"; user-facing texts say "sensitive". */
export const EMOTE_FLAG_SENSITIVE = 1 << 16;

/** WebSocket close / End of Stream codes. */
export const CloseCode = {
  ServerError: 4000,
  UnknownOperation: 4001,
  InvalidPayload: 4002,
  RateLimit: 4005,
  Restart: 4006,
  Maintenance: 4007,
  Timeout: 4008,
  AlreadySubscribed: 4009,
  NotSubscribed: 4010,
} as const;

/** Codes that point at a bug in our client: reconnecting at once would just repeat it. */
export const CLIENT_BUG_CODES: readonly number[] = [
  CloseCode.UnknownOperation,
  CloseCode.InvalidPayload,
  CloseCode.AlreadySubscribed,
  CloseCode.NotSubscribed,
];
