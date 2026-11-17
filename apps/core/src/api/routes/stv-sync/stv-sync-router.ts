import { Hono } from "hono";

import type { AppEnv } from "../../api-env";
import { stvSyncDismissEntry } from "./stv-sync.dismiss-entry";
import { stvSyncGetLog } from "./stv-sync.get-log";
import { stvSyncGetReview } from "./stv-sync.get-review";
import { stvSyncGetSync } from "./stv-sync.get-sync";
import { stvSyncLinkChannel } from "./stv-sync.link-channel";
import { stvSyncRetryEntry } from "./stv-sync.retry-entry";
import { stvSyncSetEnabled } from "./stv-sync.set-enabled";
import { stvSyncUnlink } from "./stv-sync.unlink";
import { stvSyncUpdateSettings } from "./stv-sync.update-settings";
import { stvSyncUploadEntry } from "./stv-sync.upload-entry";

/** Mounted at `/guilds/:guildId/sync`. */
export const stvSyncRouter = new Hono<AppEnv>()
  .get("/", ...stvSyncGetSync)
  .put("/", ...stvSyncLinkChannel)
  .patch("/", ...stvSyncSetEnabled)
  .delete("/", ...stvSyncUnlink)
  .put("/settings", ...stvSyncUpdateSettings)
  .get("/review", ...stvSyncGetReview)
  .get("/log", ...stvSyncGetLog)
  .post("/review/:entryId/retry", ...stvSyncRetryEntry)
  .post("/review/:entryId/upload", ...stvSyncUploadEntry)
  .delete("/review/:entryId", ...stvSyncDismissEntry);
