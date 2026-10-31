import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const kingdomId = "65b2c9c4a4b33fb94e9e0001";
  const kingdoms = new Map<string, Record<string, unknown>>([
    [kingdomId, { _id: null, name: "Saved Kingdom", kingClerkUserId: "founder", isSample: false }],
    ["65b2c9c4a4b33fb94e9e0002", { name: "Sample Kingdom", kingClerkUserId: "system", isSample: true }],
  ]);
  const members = new Map<string, Record<string, unknown>>();
  const insertOne = vi.fn(async (document: Record<string, any>) => {
    const key = `${document.kingdomId.toString()}:${document.clerkUserId}`;
    if (members.has(key)) {
      throw Object.assign(new Error("duplicate member"), { code: 11000 });
    }
    const insertedId = "membership-id";
    members.set(key, { ...document, _id: insertedId });
    return { insertedId };
  });
  const kingdomFindOne = vi.fn(async (query: { _id: { toString(): string } }) =>
    kingdoms.get(query._id.toString()) ?? null,
  );
  const memberFindOne = vi.fn(async (query: { kingdomId: { toString(): string }; clerkUserId: string }) =>
    members.get(`${query.kingdomId.toString()}:${query.clerkUserId}`) ?? null,
  );
  return {
    kingdomId,
    kingdoms,
    members,
    insertOne,
    kingdomFindOne,
    memberFindOne,
  };
});

vi.mock("../middleware/auth.js", () => ({
  requireAuth: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (req.header("authorization") !== "test-token") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as express.Request & { auth: { userId: string } }).auth = {
      userId: req.header("x-test-user") ?? "joining-player",
    };
    next();
  },
}));

vi.mock("../services/kingdoms.js", () => ({
  kingdomsCollection: async () => ({ findOne: mocks.kingdomFindOne }),
  polygonContains: vi.fn(),
}));
vi.mock("../services/memberships.js", () => ({
  membershipsCollection: async () => ({
    findOne: mocks.memberFindOne,
    insertOne: mocks.insertOne,
  }),
}));
vi.mock("../services/kingdomClaims.js", () => ({
  createKingdomWithTerritory: vi.fn(),
  upgradeKingdomBuilding: vi.fn(),
}));
vi.mock("../services/profiles.js", () => ({ upsertProfile: vi.fn() }));
vi.mock("../db.js", () => ({ getDb: () => ({}) }));

import { kingdomsRouter } from "./kingdoms.js";

const app = express().use(express.json()).use("/kingdoms", kingdomsRouter);

describe("kingdom membership join API", () => {
  beforeEach(() => {
    mocks.members.clear();
    mocks.kingdomFindOne.mockClear();
    mocks.memberFindOne.mockClear();
    mocks.insertOne.mockClear();
  });

  it("requires authentication", async () => {
    const response = await request(app).post(`/kingdoms/${mocks.kingdomId}/join`);
    expect(response.status).toBe(401);
  });

  it("joins only as a regular member in a persisted kingdom", async () => {
    const response = await request(app)
      .post(`/kingdoms/${mocks.kingdomId}/join`)
      .set("Authorization", "test-token");

    expect(response.status).toBe(201);
    expect(response.body.membership).toMatchObject({
      clerkUserId: "joining-player",
      role: "Member",
    });
    expect(mocks.insertOne).toHaveBeenCalledOnce();
  });

  it("rejects sample kingdoms, self-joining, and duplicate membership", async () => {
    const sample = await request(app)
      .post("/kingdoms/65b2c9c4a4b33fb94e9e0002/join")
      .set("Authorization", "test-token");
    const owner = await request(app)
      .post(`/kingdoms/${mocks.kingdomId}/join`)
      .set("Authorization", "test-token")
      .set("x-test-user", "founder");
    const joined = await request(app)
      .post(`/kingdoms/${mocks.kingdomId}/join`)
      .set("Authorization", "test-token");
    const duplicate = await request(app)
      .post(`/kingdoms/${mocks.kingdomId}/join`)
      .set("Authorization", "test-token");

    expect(sample.status).toBe(409);
    expect(owner.status).toBe(409);
    expect(joined.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toContain("already a member");
  });

  it("converts a concurrent unique-index collision into a conflict response", async () => {
    mocks.insertOne.mockImplementationOnce(async () => {
      throw Object.assign(new Error("duplicate member"), { code: 11000 });
    });

    const response = await request(app)
      .post(`/kingdoms/${mocks.kingdomId}/join`)
      .set("Authorization", "test-token");

    expect(response.status).toBe(409);
    expect(response.body.error).toContain("already a member");
  });
});
