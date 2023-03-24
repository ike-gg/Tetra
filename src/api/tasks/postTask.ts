import { Request, Response } from "express";

export default (req: Request, res: Response) => {
  if (!req.body.buffer) {
    res.sendStatus(400);
  }

  const { buffer } = req.body;

  const bufferek = Buffer.from(buffer);

  console.log(bufferek.byteLength);

  res.sendStatus(200);
};
