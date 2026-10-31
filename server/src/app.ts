import { z } from "zod";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { clerkMiddleware } from "@clerk/express";
import { connectDb, disconnectDb, pingDb } from "./db.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { kingdomsRouter } from "./routes/kingdoms.js";
import { challengesRouter } from "./routes/challenges.js";
import { workoutsRouter } from "./routes/workouts.js";
import { sabhaRouter } from "./routes/sabha.js";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1),
  PORT: z.coerce.number().default(4000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:5175"),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
});
export const env = envSchema.parse(process.env);

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: [env.FRONTEND_ORIGIN, "http://127.0.0.1:5175", "http://localhost:5175"], credentials: true }));
  app.use(clerkMiddleware());
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/v1", healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/kingdoms", kingdomsRouter);
  app.use("/api/v1/challenges", challengesRouter);
  app.use("/api/v1/workouts", workoutsRouter);
  app.use("/api/v1/sabha", sabhaRouter);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  });
  return app;
}
