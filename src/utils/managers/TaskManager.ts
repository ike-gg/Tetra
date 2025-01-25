import { randomBytes } from "crypto";
import * as TaskTypes from "../../types/TaskTypes";
import { PrismaClient } from "@prisma/client";
import { isDevelopment } from "../../env";

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

class TaskManager {
  private static instance: TaskManager;

  static getInstance() {
    if (TaskManager.instance) {
      return this.instance;
    }
    this.instance = new TaskManager();
    return this.instance;
  }

  tasks: TaskTypes.Storable[] = [];

  addTask<T extends TaskTypes.Base>(taskBase: Optional<T, "id">) {
    const identificator = randomBytes(8).toString("hex");

    const newTask = taskBase as TaskTypes.Storable;
    newTask.id = identificator;

    const timeoutTime = 1000 * 60 * 10; //10 minutes

    newTask.expiresIn = Date.now() + timeoutTime;

    this.tasks.push(newTask);

    setTimeout(() => {
      this.removeTask(identificator);
    }, timeoutTime);

    return identificator;
  }

  getUserTasks(userId: string) {
    const userTasks = this.tasks.filter((task) => task.interaction?.user.id === userId);
    const available = userTasks.filter((task) => task.webAccess === true);
    return available;
  }

  async webAccess(id: string) {
    const _task = this.tasks.find((t) => t.id === id);
    if (!_task) return;
    if (_task.action !== "postProcess") return;

    const webTaskExpireTime = 1000 * 60 * 30;
    const currentTime = new Date();

    const { emote, guild, interaction } = _task as TaskTypes.PostProcessEmote;
    const prisma = new PrismaClient();

    const interactionReply = await interaction?.fetchReply();

    const newTask = await prisma.manualAdjustment.create({
      data: {
        guildIcon: guild.icon,
        guildName: guild.name,
        emoteName: emote.name,
        emoteUrl: emote.file.url,
        expiresOn: new Date(currentTime.getTime() + webTaskExpireTime),
        guildId: guild.id,
        accountId: interaction!.user.id,
        channelId: interactionReply?.channelId ?? null,
        messageId: interactionReply?.id ?? null,
      },
      include: {
        account: {
          where: {
            id: interaction!.user.id,
          },
        },
      },
    });
    this.removeTask(id);
    await prisma.$disconnect();

    return newTask.id;

    // const taskIndex = this.tasks.findIndex((task) => task.id === id);
    // if (taskIndex === -1) return false;
    // this.tasks[taskIndex].webAccess = true;
    // return true;
  }

  verify(taskId: string, guildId: string, userId: string) {
    const desiredTask = this.tasks.find((task) => task.id === taskId);
    if (!desiredTask || !desiredTask.interaction) return false;
    return (
      desiredTask.interaction.guildId === guildId &&
      desiredTask.interaction.user.id === userId
    );
  }

  updateCurrentPage(id: string, newPage: number) {
    const taskIndex = this.tasks.findIndex((task) => task.id === id);
    const updatingTask = this.tasks[taskIndex];

    if (!updatingTask) return;

    if ("currentPage" in updatingTask) {
      updatingTask.currentPage = newPage;
    }
  }

  updateTask<T extends TaskTypes.Base>(id: string, newData: T) {
    const taskIndex = this.tasks.findIndex((task) => task.id === id);
    if (taskIndex === -1) return false;
    this.tasks[taskIndex] = newData;
  }

  removeTask(id: string) {
    this.tasks = this.tasks.filter((task) => task.id !== id);
  }

  getTask<T extends TaskTypes.Base>(id: string): T {
    const findTask = this.tasks.find((task) => task.id === id);
    return findTask as T;
  }
}

export default TaskManager;
