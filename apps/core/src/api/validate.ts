import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { ZodSchema } from "zod";

import { TetraAPIError } from "./tetra-api-error";

/** `zValidator` that answers invalid input with the standard API error. */
export const validate = <T extends ZodSchema, Target extends keyof ValidationTargets>(
  target: Target,
  schema: T
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new TetraAPIError(400, "Bad request", "INVALID_REQUEST_SCHEMA");
    }
  });
