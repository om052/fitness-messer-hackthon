import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { challengesCollection } from "../services/challenges.js";
import { hasBothChallengeAgreements } from "../services/challengeRules.js";
import { kingdomsCollection } from "../services/kingdoms.js";
import { membershipsCollection } from "../services/memberships.js";
import { getDb } from "../db.js";
import { SUPPORTED_EXERCISES } from "../services/workoutRules.js";

export const challengesRouter = Router();

const createSchema = z.object({
  requestId: z.string().uuid(),
  kingdomId: z.string().min(1),
  defenderId: z.string().min(1),
  type: z.enum(["leadership", "training"]),
  exerciseId: z.enum(SUPPORTED_EXERCISES),
  timeLimitMin: z.number().int().positive().max(1440),
}).strict();

challengesRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid challenge request", details: parsed.error.flatten() });
  const userId = (req as any).auth.userId;
  const { requestId, kingdomId, defenderId, type, exerciseId, timeLimitMin } = parsed.data;
  const { ObjectId } = await import("mongodb");
  if (!/^[a-f0-9]{24}$/i.test(kingdomId)) return res.status(400).json({ error: "invalid id" });
  const kcol = await kingdomsCollection();
  const kingdom = await kcol.findOne({ _id: new ObjectId(kingdomId) });
  if (!kingdom) return res.status(404).json({ error: "kingdom not found" });
  const mcol = await membershipsCollection();
  const challengerMem = await mcol.findOne({ kingdomId: new ObjectId(kingdomId), clerkUserId: userId });
  if (!challengerMem) return res.status(403).json({ error: "not a member of this kingdom" });
  if (defenderId === userId) return res.status(400).json({ error: "you cannot challenge yourself" });
  const defenderMem = await mcol.findOne({
    kingdomId: new ObjectId(kingdomId),
    clerkUserId: defenderId,
  });
  if (!defenderMem) return res.status(400).json({ error: "defender must be a member of this kingdom" });
  if (type === "leadership") {
    if (challengerMem.role !== "Senapati") return res.status(403).json({ error: "only Senapati can challenge the King" });
    if (defenderMem.role !== "King") return res.status(400).json({ error: "defender must be the King" });
  }
  const ccol = await challengesCollection();
  const existing = await ccol.findOne({
    kingdomId: new ObjectId(kingdomId),
    requestId,
  });
  if (existing) {
    if (
      existing.challengerId !== userId ||
      existing.defenderId !== defenderId ||
      existing.type !== type ||
      existing.exerciseId !== exerciseId ||
      existing.timeLimitMin !== timeLimitMin
    ) {
      return res.status(409).json({ error: "request ID was already used for a different challenge" });
    }
    return res.json({ challenge: existing, duplicate: true });
  }
  const now = new Date();
  const doc = {
    requestId,
    kingdomId: new ObjectId(kingdomId),
    challengerId: userId,
    challengerName: undefined,
    defenderId,
    defenderName: undefined,
    type,
    exerciseId,
    timeLimitMin,
    status: "pending" as const,
    rules: "Fair challenge as per established rules.",
    createdAt: now,
    updatedAt: now,
  };
  let insertedId;
  try {
    const result = await ccol.insertOne(doc);
    insertedId = result.insertedId;
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== 11000
    ) {
      throw error;
    }
    const concurrent = await ccol.findOne({
      kingdomId: new ObjectId(kingdomId),
      requestId,
    });
    if (!concurrent) throw error;
    if (
      concurrent.challengerId !== userId ||
      concurrent.defenderId !== defenderId ||
      concurrent.type !== type ||
      concurrent.exerciseId !== exerciseId ||
      concurrent.timeLimitMin !== timeLimitMin
    ) {
      return res.status(409).json({ error: "request ID was already used for a different challenge" });
    }
    return res.json({ challenge: concurrent, duplicate: true });
  }
  res.status(201).json({ challenge: { ...doc, _id: insertedId }, duplicate: false });
});

challengesRouter.get("/kingdom/:kingdomId", requireAuth, async (req, res) => {
  const { ObjectId } = await import("mongodb");
  if (!/^[a-f0-9]{24}$/i.test(req.params.kingdomId)) return res.status(400).json({ error: "invalid id" });
  const membership = await (await membershipsCollection()).findOne({
    kingdomId: new ObjectId(req.params.kingdomId),
    clerkUserId: (req as any).auth.userId as string,
  });
  if (!membership) return res.status(403).json({ error: "kingdom membership required" });
  const ccol = await challengesCollection();
  const docs = await ccol.find({ kingdomId: new ObjectId(req.params.kingdomId) }).toArray();
  res.json({ challenges: docs });
});

const agreeSchema = z.object({
  agreedExercise: z.string().min(1),
  agreedTimeLimitMin: z.number().int().positive(),
});

challengesRouter.post("/:id/agree", requireAuth, async (req, res) => {
  const { ObjectId } = await import("mongodb");
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ error: "invalid id" });
  const userId = (req as any).auth.userId;
  const parsed = agreeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid agreement" });
  const ccol = await challengesCollection();
  const ch = await ccol.findOne({ _id: new ObjectId(req.params.id) });
  if (!ch) return res.status(404).json({ error: "challenge not found" });
  if (ch.defenderId !== userId && ch.challengerId !== userId) return res.status(403).json({ error: "not a participant" });
  if (ch.status !== "pending") return res.status(409).json({ error: "challenge is no longer accepting agreements" });
  if (
    (ch.agreedExercise !== undefined && ch.agreedExercise !== parsed.data.agreedExercise) ||
    (ch.agreedTimeLimitMin !== undefined && ch.agreedTimeLimitMin !== parsed.data.agreedTimeLimitMin)
  ) {
    return res.status(409).json({ error: "challenge conditions were already proposed and cannot be changed" });
  }
  const now = new Date();
  const acceptanceField = ch.challengerId === userId ? "challengerAcceptedAt" : "defenderAcceptedAt";
  const update = await ccol.updateOne(
    {
      _id: ch._id,
      status: "pending",
      $and: [
        { $or: [{ agreedExercise: { $exists: false } }, { agreedExercise: parsed.data.agreedExercise }] },
        { $or: [{ agreedTimeLimitMin: { $exists: false } }, { agreedTimeLimitMin: parsed.data.agreedTimeLimitMin }] },
      ],
    },
    {
      $set: {
        agreedExercise: parsed.data.agreedExercise,
        agreedTimeLimitMin: parsed.data.agreedTimeLimitMin,
        [acceptanceField]: now,
        updatedAt: now,
      },
    },
  );
  if (update.matchedCount === 0) {
    return res.status(409).json({ error: "challenge conditions changed; reload and try again" });
  }
  let updated = await ccol.findOne({ _id: ch._id });
  if (!updated) return res.status(404).json({ error: "challenge not found" });
  if (hasBothChallengeAgreements(updated)) {
    await ccol.updateOne(
      { _id: ch._id, status: "pending", challengerAcceptedAt: { $exists: true }, defenderAcceptedAt: { $exists: true } },
      { $set: { status: "agreed", agreedAt: now, updatedAt: now } },
    );
    updated = await ccol.findOne({ _id: ch._id });
  }
  res.json({ challenge: updated });
});

challengesRouter.post("/:id/resolve", requireAuth, async (req, res) => {
  const { ObjectId } = await import("mongodb");
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ error: "invalid id" });
  const userId = (req as any).auth.userId;
  const ccol = await challengesCollection();
  const ch = await ccol.findOne({ _id: new ObjectId(req.params.id) });
  if (!ch) return res.status(404).json({ error: "challenge not found" });
  if (ch.defenderId !== userId && ch.challengerId !== userId) return res.status(403).json({ error: "not a participant" });
  if (ch.status !== "agreed") return res.status(409).json({ error: "challenge conditions must be agreed before resolution" });
  if (!ch.verifiedResult?.verifiedAt) {
    return res.status(409).json({ error: "no server-verified battle result is available; client-submitted outcomes are not accepted" });
  }
  const { result, outcome } = ch.verifiedResult;
  const now = new Date();
  const session = (await getDb()).client.startSession();
  try {
    const useTx = (session as any).withTransaction;
    if (useTx) {
      await session.withTransaction(async () => {
        await ccol.updateOne({ _id: ch._id }, { $set: { status: "resolved", result, outcome, updatedAt: now } }, { session });
        if (ch.type === "leadership" && outcome === "challenger_wins") {
          const kcol = await kingdomsCollection();
          const mcol = await membershipsCollection();
          await mcol.updateMany({ kingdomId: ch.kingdomId, role: "King" }, { $set: { role: "Member" } }, { session });
          await mcol.updateOne({ kingdomId: ch.kingdomId, clerkUserId: ch.challengerId }, { $set: { role: "King" } }, { session });
          await kcol.updateOne({ _id: ch.kingdomId }, { $set: { kingClerkUserId: ch.challengerId, updatedAt: now } }, { session });
        }
      });
    } else {
      await ccol.updateOne({ _id: ch._id }, { $set: { status: "resolved", result, outcome, updatedAt: now } });
      if (ch.type === "leadership" && outcome === "challenger_wins") {
        const kcol = await kingdomsCollection();
        const mcol = await membershipsCollection();
        await mcol.updateMany({ kingdomId: ch.kingdomId, role: "King" }, { $set: { role: "Member" } });
        await mcol.updateOne({ kingdomId: ch.kingdomId, clerkUserId: ch.challengerId }, { $set: { role: "King" } });
        await kcol.updateOne({ _id: ch.kingdomId }, { $set: { kingClerkUserId: ch.challengerId, updatedAt: now } });
      }
    }
  } finally {
    await session.endSession();
  }
  const updated = await ccol.findOne({ _id: ch._id });
  res.json({ challenge: updated });
});
