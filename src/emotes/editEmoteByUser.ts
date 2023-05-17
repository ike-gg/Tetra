import TaskManager from "../utils/managers/TaskManager";
import * as TaskTypes from "../types/TaskTypes";
import getPostProcessRow from "../utils/elements/getPostProcessRow";
import getSubmitEmoteRow from "../utils/elements/getSubmitEmoteRow";
import getManualAdjustmentRow from "../utils/elements/getManualAdjustmentRow";

const editEmoteByUser = async (taskId: string) => {
  // let origin: "postProcess" | undefined;

  // if (options.origin === "postProcess") origin = "postProcess";

  const { emote, feedback, guild, interaction } =
    TaskManager.getInstance().getTask<TaskTypes.PostProcessEmote>(taskId);

  let isRateLimited: NodeJS.Timeout | undefined;

  try {
    const postProcessRow = getPostProcessRow(taskId, {
      isEmoteAnimated: emote.animated,
    });

    const manualRow = getManualAdjustmentRow(taskId);

    const submitRow = getSubmitEmoteRow(taskId, emote.name);

    await feedback.editEmoteByUser(emote);
    await feedback.updateComponents([postProcessRow, manualRow, submitRow]);
  } catch (error) {
    if (isRateLimited) clearTimeout(isRateLimited);
    await feedback.error(String(error));
  }
};

export default editEmoteByUser;
