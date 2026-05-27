import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  const id = (req.headers["x-request-id"] as string) || uuidv4();
  req.headers["x-request-id"] = id;
  req.requestId = id;
  next();
}
