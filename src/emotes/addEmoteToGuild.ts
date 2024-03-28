import TaskManager from "../utils/managers/TaskManager";
import * as TaskTypes from "../types/TaskTypes";
import { Messages } from "../constants/messages";
import { announceUse } from "../utils/managers/FeedbackManager";

const addEmoteToGuild = async (taskId: string) => {
  const taskDetails =
    TaskManager.getInstance().getTask<TaskTypes.PostProcessEmote>(taskId);

  const { feedback, emote, guild } = taskDetails;

  if (Array.isArray(emote.slices) && emote.slices.length > 1) {
    try {
      await feedback.removeComponents();
      await feedback.warning(
        `Uploading ${emote.slices.length} emotes.. it could take a while`
      );
      const uploadedEmotes = await Promise.all(
        emote.slices.map(async (emoteSlice, i) => {
          const addedEmote = await guild.emojis.create({
            attachment: emoteSlice,
            name: `${emote.name}${i + 1}`,
          });
          return addedEmote;
        })
      );
      await feedback.success(
        `Successfully uploaded all emotes. ${uploadedEmotes.join(", ")}`
      );
    } catch (error) {
      await feedback.handleError(error);
    }
    return;
  }

  try {
    await feedback.removeComponents();
    const addedEmote = await guild.emojis.create({
      attachment: emote.finalData,
      name: emote.name,
    });
    await feedback.success(Messages.ADDED_EMOTE(addedEmote));
    await announceUse(Messages.ANNOUNCE_ADDED_EMOTE(addedEmote));
  } catch (error) {
    await feedback.handleError(error);
  }
};

export default addEmoteToGuild;
