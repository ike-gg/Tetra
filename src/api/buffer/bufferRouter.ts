import { Router } from "express";
import postProcess from "./postProcess";

const bufferRouter = Router();
bufferRouter.post("/process", postProcess);

export default bufferRouter;
