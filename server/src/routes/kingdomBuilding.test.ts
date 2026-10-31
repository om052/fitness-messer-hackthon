import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { upgradeKingdomBuilding, membershipFindOne } = vi.hoisted(() => ({
  upgradeKingdomBuilding: vi.fn(),
  membershipFindOne: vi.fn(),
}));

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

vi.mock("../services/kingdomClaims.js", () => ({
  createKingdomWithTerritory: vi.fn(),
  upgradeKingdomBuilding,
}));

vi.mock("../services/kingdoms.js", () => ({
  kingdomsCollection: vi.fn(async () => ({ findOne: vi.fn() })),
  polygonContains: vi.fn(),
}));

vi.mock("../services/memberships.js", () => ({
  membershipsCollection: vi.fn(async () => ({ findOne: membershipFindOne })),
}));

vi.mock("../services/profiles.js", () => ({ upsertProfile: vi.fn() }));
vi.mock("../db.js", () => ({ getDb: () => ({}) }));

import { kingdomsRouter } from "./kingdoms.js";

const app = express().use(express.json()).use("/kingdoms", kingdomsRouter);
const kingdomId = "64b64c3f6f0a2e3c4d5e6f70";
const buildingId = "kingdom-palace";
const requestId = "23c7ab66-50c7-4bfc-a18e-3c6634502b00";
const endpoint = `/kingdoms/${kingdomId}/buildings/${buildingId}/upgrade`;

describe("kingdom building upgrade API", () => {
  beforeEach(() => {
    membershipFindOne.mockReset();
    upgradeKingdomBuilding.mockReset();
  });

  it("requires authentication and kingdom membership", async () => {
    const unauthenticated = await request(app).post(endpoint).send({ requestId });
    expect(unauthenticated.status).toBe(401);

    membershipFindOne.mockResolvedValue(null);
    const nonMember = await request(app)
      .post(endpoint)
      .set("Authorization", "Bearer test-token")
      .send({ requestId });
    expect(nonMember.status).toBe(403);
    expect(upgradeKingdomBuilding).not.toHaveBeenCalled();
  });

  it("validates request IDs and refuses upgrades without verified progress", async () => {
    membershipFindOne.mockResolvedValue({ role: "Member" });
    const malformed = await request(app)
      .post(endpoint)
      .set("Authorization", "Bearer test-token")
      .send({ requestId: "not-a-uuid" });
    expect(malformed.status).toBe(400);

    upgradeKingdomBuilding.mockResolvedValue({ kind: "insufficient_progress" });
    const incomplete = await request(app)
      .post(endpoint)
      .set("Authorization", "Bearer test-token")
      .send({ requestId });
    expect(incomplete.status).toBe(409);
    expect(incomplete.body.error).toContain("verified construction progress");
  });

  it("returns persisted state and records idempotent retries honestly", async () => {
    membershipFindOne.mockResolvedValue({ role: "King" });
    const kingdom = { _id: kingdomId, treasury: 0 };
    const operation = { requestId, cost: 0 };
    upgradeKingdomBuilding.mockResolvedValue({
      kind: "duplicate",
      kingdom,
      operation,
    });

    const response = await request(app)
      .post(endpoint)
      .set("Authorization", "Bearer test-token")
      .send({ requestId });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      kingdom: { treasury: 0 },
      operation: { requestId },
      duplicate: true,
    });
  });
});
