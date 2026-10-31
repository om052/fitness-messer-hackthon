import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  return {
    createKingdomWithTerritory: vi.fn(),
    upsertProfile: vi.fn(),
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
      userId: req.header("x-test-user") ?? "creator",
    };
    next();
  },
}));

vi.mock("../services/kingdomClaims.js", () => ({
  createKingdomWithTerritory: mocks.createKingdomWithTerritory,
  upgradeKingdomBuilding: vi.fn(),
}));

vi.mock("../services/profiles.js", () => ({ upsertProfile: mocks.upsertProfile }));

vi.mock("../services/kingdoms.js", () => ({
  kingdomsCollection: vi.fn(),
  polygonContains: vi.fn(),
}));

vi.mock("../services/memberships.js", () => ({
  membershipsCollection: vi.fn(),
}));

vi.mock("../db.js", () => ({ getDb: () => ({}) }));

import { kingdomsRouter } from "./kingdoms.js";

const app = express().use(express.json()).use("/kingdoms", kingdomsRouter);

describe("kingdom creation API", () => {
  beforeEach(() => {
    mocks.createKingdomWithTerritory.mockReset();
    mocks.upsertProfile.mockReset();
  });

  it("creates a kingdom in an unclaimed territory successfully", async () => {
    const kingdom = { _id: "k1", name: "Test Kingdom" };
    mocks.createKingdomWithTerritory.mockResolvedValue({ kind: "created", kingdom });

    const response = await request(app)
      .post("/kingdoms")
      .set("Authorization", "test-token")
      .send({ name: "Test Kingdom", description: "desc", lat: 51.5, lng: -0.12 });

    expect(response.status).toBe(201);
    expect(response.body.kingdom).toEqual(kingdom);
    expect(mocks.upsertProfile).toHaveBeenCalledWith("creator");
    expect(mocks.createKingdomWithTerritory).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ clerkUserId: "creator", name: "Test Kingdom", lat: 51.5, lng: -0.12 }),
    );
  });

  it("returns conflict when territory overlaps a real claim", async () => {
    mocks.createKingdomWithTerritory.mockResolvedValue({ kind: "conflict" });

    const response = await request(app)
      .post("/kingdoms")
      .set("Authorization", "test-token")
      .send({ name: "Test Kingdom", lat: 40, lng: -74 });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("territory overlaps an existing claim");
  });

  it("rejects invalid coordinates", async () => {
    const response = await request(app)
      .post("/kingdoms")
      .set("Authorization", "test-token")
      .send({ name: "Bad", lat: 200, lng: 0 });

    expect(response.status).toBe(400);
  });

  it("passes intended coordinates to service", async () => {
    mocks.createKingdomWithTerritory.mockResolvedValue({ kind: "created", kingdom: { _id: "k2" } });

    await request(app)
      .post("/kingdoms")
      .set("Authorization", "test-token")
      .send({ name: "X", lat: 51.50737, lng: -0.1277 });

    expect(mocks.createKingdomWithTerritory).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ lat: 51.50737, lng: -0.1277 }),
    );
  });
});
