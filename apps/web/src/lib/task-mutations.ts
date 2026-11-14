import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { toast } from "@/components/ui/toaster";
import { ApiError, api, unwrap } from "@/lib/api";
import { emoteErrorMessage } from "@/lib/emote-mutations";
import {
  holdSlotCounts,
  refreshSlotCounts,
  shiftSlotCounts,
  slotTypeOfPreview,
} from "@/lib/guild-slots";
import { type Task, tasksQueryOptions } from "@/lib/tasks";

// Core takes these three only; the editor never renders JPEG for a task
const DATA_URL_TYPES = /^data:image\/(gif|png|webp);base64,/;

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      if (DATA_URL_TYPES.test(url)) resolve(url);
      else reject(new Error("Only GIF, PNG and WebP can be added."));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

// The task is gone from the server either way: drop it from every cache, so Home and
// Tasks don't show it until their refetch lands
function useForgetTask(taskId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.setQueryData<Task[]>(tasksQueryOptions.queryKey, (tasks) =>
      tasks?.filter(({ id }) => id !== taskId)
    );
    queryClient.removeQueries({ queryKey: ["tasks", taskId] });
    queryClient.removeQueries({ queryKey: ["task-file", taskId] });
    return queryClient.invalidateQueries({
      queryKey: tasksQueryOptions.queryKey,
      exact: true,
    });
  };
}

type AddVariables = { blob: Blob; name: string };

/**
 * "Add to <server>": uploads the editor's result for the task. On success the task is
 * gone and the user lands on the server's emotes; on error the editor stays as it was.
 */
export function useAddTaskEmote(task: Task, guildName: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const forget = useForgetTask(task.id);

  const mutation = useMutation({
    mutationFn: async ({ blob, name }: AddVariables) =>
      unwrap(
        api.tasks[":taskId"].$post({
          param: { taskId: task.id },
          json: { emote: await toDataUrl(blob), name },
        })
      ),
    onSuccess: async ({ preview }) => {
      // Counts before leaving, so the server page opens with them. Leave before the
      // refetches: the page observes the task, and it 404s from now on
      await holdSlotCounts(queryClient, task.guildId);
      shiftSlotCounts(queryClient, task.guildId, slotTypeOfPreview(preview), 1);
      await navigate({
        to: "/panel/servers/$guildId",
        params: { guildId: task.guildId },
      });
      await Promise.all([forget(), refreshSlotCounts(queryClient, task.guildId)]);
    },
  });

  const add = (variables: AddVariables) => {
    const label = `:${variables.name}:`;
    toast.promise(mutation.mutateAsync(variables), {
      loading: `Adding ${label} to ${guildName}…`,
      success: { title: `Added ${label} to ${guildName}` },
      error: (error) => ({
        title: `Couldn't add ${label} to ${guildName}`,
        description: emoteErrorMessage(error),
      }),
    });
  };

  return { add, pending: mutation.isPending };
}

const isGone = (error: unknown) =>
  error instanceof ApiError && error.reference === "TASK_NOT_FOUND";

/**
 * Deletes the task (and its stored source) for good. Already gone counts as done. Returns
 * the promise so a confirm dialog can stay open and show the error while it runs.
 */
export function useDiscardTask(task: Task) {
  const navigate = useNavigate();
  const forget = useForgetTask(task.id);

  return async () => {
    try {
      await unwrap(api.tasks[":taskId"].$delete({ param: { taskId: task.id } }));
    } catch (error) {
      if (!isGone(error)) throw new Error(emoteErrorMessage(error));
    }
    await navigate({ to: "/panel/tasks" });
    void forget();
    toast.success(`Discarded :${task.emote.name}:`, {
      description: "The task and its original file are deleted.",
    });
  };
}
