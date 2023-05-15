import { Router } from "express";
import getTask from "./getTask";
import postTask from "./postTask";
import getTasks from "./getTasks";
import validateUser from "../middleware/validateUser";
import getGuilds from "./getGuilds";
import getGuildEmojis from "./getGuildEmojis";

const taskRouter = Router();

taskRouter.use(async (req, res, next) => {
  if (!req.cookies.token) {
    res.status(401).json({ error: "Unauthorized. Missing cookies." });
    return;
  }
  const userId = await validateUser(req.cookies.token);
  if (!userId) {
    res.clearCookie("token");
    res.status(401).json({ error: "Unauthorized. Missing cookies." });
    return;
  }
  res.locals.userId = userId;
  next();
});

taskRouter.get("/guilds", getGuilds);
taskRouter.get("/guilds/emotes/:guildId", getGuildEmojis);
taskRouter.get("/:id", getTask);
taskRouter.get("/", getTasks);
taskRouter.post("/", postTask);

export default taskRouter;
