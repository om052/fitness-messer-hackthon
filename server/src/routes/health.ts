import { Router } from "express";
import { pingDb } from "../db.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

healthRouter.get("/ready", async (_req, res) => {
  try {
    await pingDb();
    res.json({ status: "ready", database: "connected" });
  } catch (e: any) {
    res.status(503).json({ status: "not_ready", database: "disconnected", error: e.message });
  }
});