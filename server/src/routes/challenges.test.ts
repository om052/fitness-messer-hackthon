import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { documents, membershipForUser, challengeFindOne, challengeInsertOne } = vi.hoisted(() => {
  const documents = new Map<string, Record<string, unknown>>();
  const membershipForUser = vi.fn();
  const challengeFindOne = vi.fn(async (filter: { requestId?: string }) =>
    filter.requestId ? documents.get(filter.requestId) ?? null : null,
  );
  const challengeInsertOne = vi.fn(async (document: Record<string, unknown>) => {
    const requestId = document.requestId as string;
    if (documents.has(requestId)) {
      throw Object.assign(new Error("duplicate key"), { code: 11000 });
    }
    documents.set(requestId, document);
    return { insertedId: "created-id" };
  });
  return { documents, membershipForUser, challengeFindOne, challengeInsertOne };
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
      userId: "challenger",
    };
    next();
  },
}));

vi.mock("../services/kingdoms.js", () => ({
  kingdomsCollection: async () => ({ findOne: async () => ({ _id: "kingdom" }) }),
}));

vi.mock("../services/memberships.js", () => ({
  membershipsCollection: async () => ({ findOne: membershipForUser }),
}));

vi.mock("../services/challenges.js", () => ({
  challengesCollection: async () => ({
    findOne: challengeFindOne,
    insertOne: challengeInsertOne,
    find: () => ({ toArray: async () => [] }),
    updateOne: vi.fn(),
  }),
}));

vi.mock("../db.js", () => ({ getDb: () => ({ client: { startSession: vi.fn() } }) }));

import { challengesRouter } from "./challenges.js";

const app = express().use(express.json()).use("/challenges", challengesRouter);
const kingdomId = "64b64c3f6f0a2e3c4d5e6f70";
const requestId = "23c7ab66-50c7-4bfc-a18e-3c6634502b00";
const payload = {
  requestId,
  kingdomId,
  defenderId: "king",
  type: "leadership",
  exerciseId: "pushup",
  timeLimitMin: 10,
};

describe("persistent challenge authorization", () => {
  beforeEach(() => {
    documents.clear();
    membershipForUser.mockReset();
    challengeFindOne.mockClear();
    challengeInsertOne.mockClear();
  });

  it("protects the challenge history route with authentication and membership", async () => {
    const unauthenticated = await request(app).get(`/challenges/kingdom/${kingdomId}`);
    expect(unauthenticated.status).toBe(401);

    membershipForUser.mockResolvedValue(null);
    const outsider = await request(app)
      .get(`/challenges/kingdom/${kingdomId}`)
      .set("Authorization", "Bearer test-token");
    expect(outsider.status).toBe(403);
  });

  it("requires a real same-kingdom defender and an authorized Senapati challenger", async () => {
    membershipForUser.mockImplementation(async (filter: { clerkUserId: string }) => {
      if (filter.clerkUserId === "challenger") return { role: "Member" };
      return { role: "King" };
    });
    const forbidden = await request(app)
      .post("/challenges")
      .set("Authorization", "Bearer test-token")
      .send(payload);
    expect(forbidden.status).toBe(403);
    expect(challengeInsertOne).not.toHaveBeenCalled();

    membershipForUser.mockImplementation(async (filter: { clerkUserId: string }) => {
      if (filter.clerkUserId === "challenger") return { role: "Senapati" };
      return null;
    });
    const outsiderDefender = await request(app)
      .post("/challenges")
      .set("Authorization", "Bearer test-token")
      .send(payload);
    expect(outsiderDefender.status).toBe(400);
  });

  it("validates exercises and makes identical challenge creation requests idempotent", async () => {
    membershipForUser.mockImplementation(async (filter: { clerkUserId: string }) =>
      filter.clerkUserId === "challenger"
        ? { role: "Senapati" }
        : { role: "King" },
    );
    const post = () =>
      request(app)
        .post("/challenges")
        .set("Authorization", "Bearer test-token")
        .send(payload);

    const invalid = await request(app)
      .post("/challenges")
      .set("Authorization", "Bearer test-token")
      .send({ ...payload, exerciseId: "unknown" });
    expect(invalid.status).toBe(400);

    const created = await post();
    expect(created.status).toBe(201);
    expect(created.body.challenge).toMatchObject({
      challengerId: "challenger",
      defenderId: "king",
      status: "pending",
      requestId,
    });
    expect((await post()).body.duplicate).toBe(true);
  });
});
