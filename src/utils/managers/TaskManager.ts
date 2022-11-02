import { randomBytes } from "crypto";
import {
  ButtonInteraction,
  CommandInteraction,
  ContextMenuCommandInteraction,
  MessageComponentInteraction,
} from "discord.js";
import { update } from "lodash";
import { FeedbackManager } from "./FeedbackManager";

interface TaskBase {
  action: string;
  interaction?:
    | CommandInteraction
    | ButtonInteraction
    | ContextMenuCommandInteraction;
  feedback?: FeedbackManager;
  emoteReference?: string;
  message?: MessageComponentInteraction;
  options?: {
    currentPage?: number;
    pagesLimit?: number;
  };
}

interface TaskWithId extends TaskBase {
  id?: string;
}

class TaskManager {
  tasks: TaskWithId[] = [];

  addTask(taskBase: TaskBase) {
    const identificator = randomBytes(8).toString("hex");
    const timeoutTime = 1000 * 60 * 10; //10 minutes

    const newTask: TaskWithId = taskBase;
    newTask.id = identificator;

    this.tasks.push(newTask);

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
    const findTask = this.tasks.find((task) => task.id === id);
    return findTask;
  }
}

export default TaskManager;
