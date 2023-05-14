import { z } from "zod";

const tokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string(),
  scope: z.string(),
  token_type: z.string(),
  expires_at: z.number(),
});

export type Credentials = z.infer<typeof tokenSchema>;

const validateCredentials = (token: object) => {
  const result = tokenSchema.safeParse(token);
  if (!result.success) return false;
  return true;
};

export default validateCredentials;
