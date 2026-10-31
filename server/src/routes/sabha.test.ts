import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { documents, membershipFindOne } = vi.hoisted(() => ({
  documents: new Map<string, Record<string, unknown>>(),
  membershipFindOne: vi.fn(),
}));

const fakeCollection = {
  createIndex: vi.fn(async () => "index"),
  findOne: vi.fn(async (filter: { kingdomId: { toString(): string }; requestId: string }) =>
    documents.get(`${filter.kingdomId.toString()}:${filter.requestId}`) ?? null,
  ),
  insertOne: vi.fn(async (document: Record<string, unknown>) => {
    const kingdomId = document.kingdomId as { toString(): string };
    const key = `${kingdomId.toString()}:${document.requestId}`;
    if (documents.has(key)) {
      throw Object.assign(new Error("duplicate key"), { code: 11000 });
    }
    documents.set(key, document);
    return { acknowledged: true };
  }),
  find: vi.fn(() => ({
    sort: () => ({ limit: () => ({ toArray: async () => [...documents.values()] }) }),
  })),
};

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

vi.mock("../services/memberships.js", () => ({
  membershipsCollection: async () => ({ findOne: membershipFindOne }),
}));

vi.mock("../db.js", () => ({
  getDb: () => ({ collection: () => fakeCollection }),
}));

import { sabhaRouter } from "./sabha.js";

const app = express().use(express.json()).use("/sabha", sabhaRouter);
const kingdomId = "64b64c3f6f0a2e3c4d5e6f70";
const requestId = "23c7ab66-50c7-4bfc-a18e-3c6634502b00";
const payload = { requestId, title: "Council", body: "Meeting at dawn." };
const endpoint = `/sabha/kingdoms/${kingdomId}/announcements`;

describe("persistent Sabha announcements", () => {
  beforeEach(() => {
    documents.clear();
    membershipFindOne.mockReset();
    fakeCollection.createIndex.mockClear();
    fakeCollection.findOne.mockClear();
    fakeCollection.insertOne.mockClear();
  });

  it("requires authentication and kingdom membership", async () => {
    expect((await request(app).get(endpoint)).status).toBe(401);

    membershipFindOne.mockResolvedValue(null);
    const response = await request(app)
      .post(endpoint)
      .set("Authorization", "Bearer test-token")
      .send(payload);
    expect(response.status).toBe(403);
  });

  it("enforces leadership role and validates announcement fields", async () => {
    membershipFindOne.mockResolvedValue({ role: "Member" });
    const memberResponse = await request(app)
      .post(endpoint)
      .set("Authorization", "Bearer test-token")
      .send(payload);
    expect(memberResponse.status).toBe(403);

    membershipFindOne.mockResolvedValue({ role: "Mantri" });
    const invalid = await request(app)
      .post(endpoint)
      .set("Authorization", "Bearer test-token")
      .send({ ...payload, body: " " });
    expect(invalid.status).toBe(400);
  });

  it("persists an announcement and treats identical request retries idempotently", async () => {
    membershipFindOne.mockResolvedValue({ role: "King" });
    const post = () =>
      request(app)
        .post(endpoint)
        .set("Authorization", "Bearer test-token")
        .send(payload);

    const created = await post();
    expect(created.status).toBe(201);
    expect(created.body.announcement).toMatchObject({
      clerkUserId: "test-user",
      authorRole: "King",
      title: payload.title,
      body: payload.body,
    });

    const retry = await post();
    expect(retry.status).toBe(200);
    expect(retry.body.duplicate).toBe(true);

    const conflict = await request(app)
      .post(endpoint)
      .set("Authorization", "Bearer test-token")
      .send({ ...payload, body: "Different content" });
    expect(conflict.status).toBe(409);
  });
});
