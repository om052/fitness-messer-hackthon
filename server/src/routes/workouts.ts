import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { workoutsCollection } from "../services/workouts.js";
import {
  makeUnverifiedWorkout,
  submissionsMatch,
  SUPPORTED_EXERCISES,
} from "../services/workoutRules.js";

export const workoutsRouter = Router();

const submitSchema = z
  .object({
    sessionId: z.string().uuid(),
    exerciseId: z.enum(SUPPORTED_EXERCISES),
    quantity: z.number().int().positive().max(10000),
    durationSec: z.number().int().positive().max(86400),
    startedAt: z.string().datetime({ offset: true }),
  })
  .strict();

workoutsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = submitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid workout report",
      details: parsed.error.flatten(),
    });
  }

  const clerkUserId = (req as any).auth.userId as string;
  const submission = {
    ...parsed.data,
    clerkUserId,
    startedAt: new Date(parsed.data.startedAt),
  };
  const col = await workoutsCollection();
  const existing = await col.findOne({
    clerkUserId,
    sessionId: submission.sessionId,
  });
  if (existing) {
    if (!submissionsMatch(existing, submission)) {
      return res.status(409).json({
        error: "session id was already used for a different workout report",
      });
    }
    return res.json({
      workout: existing,
      duplicate: true,
      rewards: { xp: 0, strength: 0, coins: 0 },
      message: "Saved as unverified. It did not receive progression or FM rewards.",
    });
  }

  const workout = makeUnverifiedWorkout(submission);
  try {
    await col.insertOne(workout);
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) {
      throw error;
    }
    const concurrent = await col.findOne({
      clerkUserId,
      sessionId: submission.sessionId,
    });
    if (!concurrent) throw error;
    if (!submissionsMatch(concurrent, submission)) {
      return res.status(409).json({
        error: "session id was already used for a different workout report",
      });
    }
    return res.json({
      workout: concurrent,
      duplicate: true,
      rewards: { xp: 0, strength: 0, coins: 0 },
      message: "Saved as unverified. It did not receive progression or FM rewards.",
    });
  }

  res.status(201).json({
    workout,
    duplicate: false,
    rewards: { xp: 0, strength: 0, coins: 0 },
    message:
      "Saved as unverified. Camera pose verification is not connected, so this report did not receive progression or FM rewards.",
  });
});

workoutsRouter.get("/mine", requireAuth, async (req, res) => {
  const clerkUserId = (req as any).auth.userId as string;
  const workouts = await getDb()
    .collection("workouts")
    .find(
      { clerkUserId },
      {
        projection: {
          _id: 0,
          sessionId: 1,
          exerciseId: 1,
          quantity: 1,
          durationSec: 1,
          status: 1,
          startedAt: 1,
          createdAt: 1,
        },
      },
    )
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  res.json({ workouts });
});
