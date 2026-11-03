import type { MessageComponentInteraction } from "discord.js";
import { eq } from "drizzle-orm";
import type { z } from "zod";

import { db } from "@/db";
import { continuity } from "@/db/schemas/continuity";
import type { TetraClient } from "@/types";

export type ContinuityHandler<
  T = unknown,
  // biome-ignore lint/suspicious/noExplicitAny: subclasses narrow this to Button/StringSelectMenu interactions
  U extends MessageComponentInteraction = any,
> = (ctx: { interaction: U; client: TetraClient; data: T }) => Promise<void>;

/** Any continuity regardless of its data type, for registries and loaders. */
// biome-ignore lint/suspicious/noExplicitAny: `unknown` would reject handlers typed with specific data
export type AnyContinuity = BaseContinuity<any>;

export abstract class BaseContinuity<T> {
  static decodeButtonId(buttonId: string) {
    const [name, id] = buttonId.split(":");

    if (!name && !id) {
      throw new Error(`Invalid button id: ${buttonId}`);
    }

    return { name, id };
  }

  public encodeButtonId(id: string) {
    return `${this.metadata.name}:${id}`;
  }

  public handler: ContinuityHandler<T> | undefined = undefined;

  constructor(
    public schema: z.ZodTypeAny,
    public metadata: { name: string }
  ) {}

  public async getContext(id: string): Promise<T> {
    const result = await db.query.continuity.findFirst({
      where: eq(continuity.id, id),
    });

    if (!result) {
      throw new Error(`No data found for continuity in db (${this.metadata.name}:${id})`);
    }

    try {
      const parsed = this.schema.parse(result.data);
      return parsed;
    } catch {
      throw new Error(
        `Got invalid continuity data from db, validation failed:
${JSON.stringify(result.data, null, 2)}`
      );
    }
  }

  public async create(data: T) {
    const [result] = await db
      .insert(continuity)
      .values({ name: this.metadata.name, data })
      .returning();

    const buttonId = this.encodeButtonId(result.id);

    return {
      id: result.id,
      name: result.name,
      buttonId,
    };
  }
}
