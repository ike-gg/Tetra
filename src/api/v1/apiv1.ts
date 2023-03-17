import { Router } from "express";

const apiv1 = Router();

apiv1.get("/task", (req, res) => {
  console.log(req.query);
  res.json("hello!");
});

export default apiv1;
