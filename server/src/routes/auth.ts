import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import {
  completeOnboarding,
  updateProfile,
  upsertProfile,
} from "../services/profiles.js";
import { membershipsCollection } from "../services/memberships.js";
import { getDb } from "../db.js";

export const authRouter = Router();

const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(1).max(60).optional(),
    avatarSeed: z.enum(["w1", "w2", "w3", "w4", "w5", "w6"]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required.",
  });

authRouter.get("/me", requireAuth, async (req, res) => {
  const userId = (req as any).auth.userId;
  const profile = await upsertProfile(userId);
  const membership = await (await membershipsCollection()).findOne({
    clerkUserId: userId,
  });
  res.json({
    userId,
    profile,
    kingdomId: membership?.kingdomId?.toString() ?? null,
    role: membership?.role ?? null,
  });
});

authRouter.patch("/me", requireAuth, async (req, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid profile update",
      details: parsed.error.flatten(),
    });
  }

  const userId = (req as any).auth.userId as string;
  await upsertProfile(userId);
  const profile = await updateProfile(userId, parsed.data);
  res.json({ profile });
});

authRouter.post("/onboarding/complete", requireAuth, async (req, res) => {
  if (req.body && Object.keys(req.body).length > 0) {
    return res.status(400).json({ error: "onboarding completion does not accept client data" });
  }
  const userId = (req as any).auth.userId as string;
  await upsertProfile(userId);
  const profile = await completeOnboarding(userId);
  res.json({ onboarded: profile.onboarded === true });
});

authRouter.get("/dashboard", requireAuth, async (req, res) => {
  const userId = (req as any).auth.userId as string;
  const profile = await upsertProfile(userId);
  const db = getDb();
  const workouts = db.collection("workouts");
  const transactions = db.collection("fmTransactions");
  const memberships = await membershipsCollection();
  const [verifiedStats, reportedWorkoutCount, recentWorkouts, recentTransactions, memberRecords] =
    await Promise.all([
      workouts
        .aggregate<{
          count: number;
          quantity: number;
          durationSec: number;
        }>([
          { $match: { clerkUserId: userId, status: "verified" } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              quantity: { $sum: "$quantity" },
              durationSec: { $sum: "$durationSec" },
            },
          },
        ])
        .next(),
      workouts.countDocuments({ clerkUserId: userId, status: "unverified" }),
      workouts
        .find(
          { clerkUserId: userId },
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
        .limit(10)
        .toArray(),
      transactions
        .find({ clerkUserId: userId }, { projection: { clerkUserId: 0 } })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
      memberships.find({ clerkUserId: userId }).toArray(),
    ]);

  const kingdomIds = memberRecords.map((membership) => membership.kingdomId);
  const kingdoms = await db
    .collection("kingdoms")
    .find({ _id: { $in: kingdomIds } })
    .toArray();

  res.json({
    profile: {
      displayName: profile.displayName ?? null,
      xp: profile.xp,
      level: levelFromXp(profile.xp),
      strength: profile.strength,
      coins: profile.coins,
      avatarSeed: profile.avatarSeed ?? "w1",
      onboarded: profile.onboarded === true,
      createdAt: profile.createdAt,
    },
    fitness: {
      verifiedWorkoutCount: verifiedStats?.count ?? 0,
      verifiedQuantity: verifiedStats?.quantity ?? 0,
      verifiedDurationSec: verifiedStats?.durationSec ?? 0,
      unverifiedReportCount: reportedWorkoutCount,
    },
    recentWorkouts,
    transactions: recentTransactions,
    memberships: memberRecords,
    kingdoms,
  });
});

function levelFromXp(xp: number): number {
  const thresholds = [0, 500, 1500, 3500, 7000, 12000, 20000, 35000];
  return thresholds.reduce(
    (level, threshold, index) => (xp >= threshold ? index + 1 : level),
    1,
  );
}