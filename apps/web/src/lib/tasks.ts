import { queryOptions } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api";

const fetchTasks = () => unwrap(api.tasks.$get());

/** The user's pending editor tasks, newest first. */
export const tasksQueryOptions = queryOptions({
  queryKey: ["tasks"],
  queryFn: fetchTasks,
});

export type Task = Awaited<ReturnType<typeof fetchTasks>>[number];
