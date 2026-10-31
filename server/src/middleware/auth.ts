import "dotenv/config";
import { clerkMiddleware, getAuth } from "@clerk/express";
import { Request, Response, NextFunction } from "express";

export function clerkAuthMiddleware() {
  return clerkMiddleware();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  (req as any).auth = { userId: auth.userId };
  next();
}