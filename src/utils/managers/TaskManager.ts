import { randomBytes } from "crypto";
import * as TaskTypes from "../../types/TaskTypes";

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

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
    console.log(identificator);

    const newTask = taskBase as TaskTypes.Storable;
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
    const updatingTask = this.tasks[taskIndex];

    if (!updatingTask) return;

    if ("currentPage" in updatingTask) {
      updatingTask.currentPage = newPage;
    }
  }

  updateTask<T extends TaskTypes.Base>(id: string, newData: T) {
    const taskIndex = this.tasks.findIndex((task) => task.id === id);
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
