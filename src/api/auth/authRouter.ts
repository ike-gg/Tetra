import { Router } from "express";
import token from "./token";

const authRouter = Router();

authRouter.post("/token", token);

export default authRouter;
