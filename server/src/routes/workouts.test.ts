import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { documents, workoutCollection } = vi.hoisted(() => {
  const documents = new Map<string, Record<string, unknown>>();
  const workoutCollection = {
    findOne: vi.fn(async (filter: { clerkUserId: string; sessionId: string }) =>
      documents.get(`${filter.clerkUserId}:${filter.sessionId}`) ?? null,
    ),
    insertOne: vi.fn(async (document: Record<string, unknown>) => {
      const key = `${document.clerkUserId}:${document.sessionId}`;
      if (documents.has(key)) {
        throw Object.assign(new Error("duplicate key"), { code: 11000 });
      }
      documents.set(key, document);
      return { acknowledged: true };
    }),
  };
  return { documents, workoutCollection };
});

vi.mock("../middleware/auth.js", () => ({
  requireAuth: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (req.header("authorization") !== "Bearer test-token") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as express.Request & { auth: { userId: string } }).auth = {
      userId: "test-user",
    };
    next();
  },
}));

vi.mock("../services/workouts.js", () => ({
  workoutsCollection: async () => workoutCollection,
}));

vi.mock("../db.js", () => ({
  getDb: () => ({ collection: () => ({ find: () => ({}) }) }),
}));

import { workoutsRouter } from "./workouts.js";

const app = express().use(express.json()).use("/workouts", workoutsRouter);
const sessionId = "23c7ab66-50c7-4bfc-a18e-3c6634502b00";
const submission = {
  sessionId,
  exerciseId: "pushup",
  quantity: 15,
  durationSec: 90,
  startedAt: "2026-10-31T00:00:00.000Z",
};

describe("workout report API", () => {
  beforeEach(() => {
    documents.clear();
    workoutCollection.findOne.mockClear();
    workoutCollection.insertOne.mockClear();
  });

  it("requires authentication", async () => {
    const response = await request(app).post("/workouts").send(submission);
    expect(response.status).toBe(401);
  });

  it("rejects unsupported exercises and persists valid reports without rewards", async () => {
    const invalid = await request(app)
      .post("/workouts")
      .set("Authorization", "Bearer test-token")
      .send({ ...submission, exerciseId: "burpees" });
    expect(invalid.status).toBe(400);

    const saved = await request(app)
      .post("/workouts")
      .set("Authorization", "Bearer test-token")
      .send(submission);
    expect(saved.status).toBe(201);
    expect(saved.body.workout).toMatchObject({
      clerkUserId: "test-user",
      status: "unverified",
      xp: 0,
      strength: 0,
      coins: 0,
    });
    expect(saved.body.rewards).toEqual({ xp: 0, strength: 0, coins: 0 });
  });

  it("returns an idempotent retry but rejects conflicting session reuse", async () => {
    const save = () =>
      request(app)
        .post("/workouts")
        .set("Authorization", "Bearer test-token")
        .send(submission);

    expect((await save()).status).toBe(201);
    const retry = await save();
    expect(retry.status).toBe(200);
    expect(retry.body.duplicate).toBe(true);

    const conflict = await request(app)
      .post("/workouts")
      .set("Authorization", "Bearer test-token")
      .send({ ...submission, quantity: 16 });
    expect(conflict.status).toBe(409);
  });
});
