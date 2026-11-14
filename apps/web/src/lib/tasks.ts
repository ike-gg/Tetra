import { queryOptions } from "@tanstack/react-query";

import { api, unwrap, unwrapBlob } from "@/lib/api";

const fetchTasks = () => unwrap(api.tasks.$get());

/** The user's pending editor tasks, newest first. */
export const tasksQueryOptions = queryOptions({
  queryKey: ["tasks"],
  queryFn: fetchTasks,
});

export type Task = Awaited<ReturnType<typeof fetchTasks>>[number];

/** One task (`["tasks", taskId]`); 404 `TASK_NOT_FOUND` once it's fixed or discarded. */
export const taskQueryOptions = (taskId: string) =>
  queryOptions({
    queryKey: ["tasks", taskId],
    queryFn: () => unwrap(api.tasks[":taskId"].$get({ param: { taskId } })),
  });

/**
 * The task's source file through core's proxy (third-party hosts don't send CORS
 * headers). Its own key, so invalidating `["tasks"]` never downloads it again. No
 * automatic retries: a dead upstream takes up to ~30 s per try, the user retries.
 */
export const taskFileQueryOptions = (taskId: string) =>
  queryOptions({
    queryKey: ["task-file", taskId],
    queryFn: () => unwrapBlob(api.tasks[":taskId"].file.$get({ param: { taskId } })),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });
