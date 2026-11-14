import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { editorTasks } from "@/db/schema";

import { userFactory } from "../../api-env";
import { requireUser } from "../../middleware/auth";
import { toApiEditorTask } from "./tasks.shared";

export const tasksGetTasks = userFactory.createHandlers(requireUser, async (c) => {
  const tasks = await db.query.editorTasks.findMany({
    where: eq(editorTasks.userId, c.get("user").id),
    with: { emote: true },
    orderBy: desc(editorTasks.createdAt),
  });

  return c.json(
    tasks.flatMap((task) =>
      task.emote ? [toApiEditorTask({ ...task, emote: task.emote })] : []
    ),
    200
  );
});
