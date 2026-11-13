import { desc, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

import { db } from "@/db";
import { editorTasks } from "@/db/schema";

import { toApiEditorTask } from "./tasks.shared";

export const tasksGetTasks = async (req: Request, res: Response, _: NextFunction) => {
  const tasks = await db.query.editorTasks.findMany({
    where: eq(editorTasks.userId, req.user!.id),
    with: { emote: true },
    orderBy: desc(editorTasks.createdAt),
  });

  res.json(
    tasks.flatMap((task) =>
      task.emote ? [toApiEditorTask({ ...task, emote: task.emote })] : []
    )
  );
};
