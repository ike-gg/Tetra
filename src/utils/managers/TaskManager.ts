import { randomBytes } from "crypto";
import {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuCommandInteraction,
  MessageComponentInteraction,
} from "discord.js";
import { FeedbackManager } from "./FeedbackManager";

import TaskTypes from "../../types/TaskTypes";

class TaskManager {
  tasks: TaskWithId[] = [];

  addTask<T extends EmoteNavigatorTask>(taskBase: T) {
    const identificator = randomBytes(8).toString("hex");
    console.log("creating task");

    const newTask = taskBase;
    newTask.id = identificator;

    this.tasks.push(newTask);

    const timeoutTime = 1000 * 60 * 10; //10 minutes
    setTimeout(() => {
      this.removeTask(identificator);
    }, timeoutTime);

    return identificator;
  }

  updateCurrentPage(id: string, newPage: number) {
    const taskIndex = this.tasks.findIndex((task) => task.id === id);
    if (taskIndex === -1) return false;
    this.tasks[taskIndex].options!.currentPage = newPage;
  }

  removeTask(id: string) {
    this.tasks = this.tasks.filter((task) => task.id !== id);
  }

  getTask(id: string) {
    //bypass to do not create new task when it destiny is to only cancel the action.
    if (id === "cancelAction") {
      return {
        action: "cancelAction",
      };
    }

    const findTask = this.tasks.find((task) => task.id === id);
    return findTask;
  }
}

export default TaskManager;
