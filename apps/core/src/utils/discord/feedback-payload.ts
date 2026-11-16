import { type ActionRowBuilder, isJSONEncodable, MessageFlags } from "discord.js";

import { TetraEmbed, type TetraEmbedContent } from "@/utils/embed-messages/tetra-embed";

import {
  bodyToComponents,
  type TopLevelComponent,
  V2_FLAG,
  withFooter,
} from "./components-v2";

export type FeedbackPayloadType = Exclude<
  keyof typeof TetraEmbed,
  "prototype" | "_transform"
>;

/**
 * A fresh Components v2 reply in the generic style (emoji title, neutral container,
 * `-# tetra`), for answers outside a `FeedbackManager` message: ephemeral notices,
 * /media states. Mentions never ping.
 */
export const feedbackPayload = (
  type: FeedbackPayloadType,
  content: TetraEmbedContent,
  options: { rows?: ActionRowBuilder[]; ephemeral?: boolean } = {}
) => ({
  components: [
    ...withFooter(bodyToComponents(null, [TetraEmbed[type](content)])),
    ...(options.rows ?? []).map(
      (row) => (isJSONEncodable(row) ? row.toJSON() : row) as TopLevelComponent
    ),
  ],
  flags: options.ephemeral
    ? V2_FLAG | MessageFlags.Ephemeral
    : (V2_FLAG as MessageFlags.IsComponentsV2),
  allowedMentions: { parse: [] as never[] },
});
