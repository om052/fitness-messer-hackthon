import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const profileMocks = vi.hoisted(() => ({
  upsertProfile: vi.fn(async (clerkUserId: string) => ({
    clerkUserId,
    displayName: "Player",
    xp: 0,
    strength: 0,
    coins: 0,
    avatarSeed: "w1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  })),
  updateProfile: vi.fn(async (
    clerkUserId: string,
    changes: { displayName?: string; avatarSeed?: string },
  ) => ({
    clerkUserId,
    ...changes,
    xp: 0,
    strength: 0,
    coins: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  })),
  completeOnboarding: vi.fn(async (clerkUserId: string) => ({
    clerkUserId,
    onboarded: true,
    xp: 0,
    strength: 0,
    coins: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  })),
}));

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
      userId: "authenticated-player",
    };
    next();
  },
}));

vi.mock("../services/profiles.js", () => profileMocks);
vi.mock("../services/memberships.js", () => ({
  membershipsCollection: async () => ({ findOne: async () => null }),
}));
vi.mock("../db.js", () => ({ getDb: () => ({}) }));

import { authRouter } from "./auth.js";

const app = express().use(express.json()).use("/auth", authRouter);

describe("authenticated profile API", () => {
  beforeEach(() => {
    profileMocks.upsertProfile.mockClear();
    profileMocks.updateProfile.mockClear();
    profileMocks.completeOnboarding.mockClear();
  });

  it("rejects profile reads and updates without authentication", async () => {
    expect((await request(app).get("/auth/me")).status).toBe(401);
    expect((await request(app).patch("/auth/me").send({ displayName: "Other" })).status).toBe(401);
  });

  it("updates only the authenticated player's allowed profile fields", async () => {
    const response = await request(app)
      .patch("/auth/me")
      .set("Authorization", "test-token")
      .send({ displayName: "  New Name ", avatarSeed: "w3" });

    expect(response.status).toBe(200);
    expect(profileMocks.upsertProfile).toHaveBeenCalledWith("authenticated-player");
    expect(profileMocks.updateProfile).toHaveBeenCalledWith(
      "authenticated-player",
      { displayName: "New Name", avatarSeed: "w3" },
    );
    expect(response.body.profile).toMatchObject({
      displayName: "New Name",
      avatarSeed: "w3",
      xp: 0,
      coins: 0,
    });
  });

  it("rejects progression fields, unknown properties, and empty updates", async () => {
    const headers = { Authorization: "test-token" };
    const progression = await request(app)
      .patch("/auth/me")
      .set(headers)
      .send({ xp: 10000 });
    const unknownField = await request(app)
      .patch("/auth/me")
      .set(headers)
      .send({ displayName: "Valid", role: "King" });
    const empty = await request(app)
      .patch("/auth/me")
      .set(headers)
      .send({ displayName: "   " });

    expect(progression.status).toBe(400);
    expect(unknownField.status).toBe(400);
    expect(empty.status).toBe(400);
    expect(profileMocks.updateProfile).not.toHaveBeenCalled();
  });

  it("persists onboarding completion for the authenticated player only", async () => {
    const response = await request(app)
      .post("/auth/onboarding/complete")
      .set("Authorization", "test-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ onboarded: true });
    expect(profileMocks.upsertProfile).toHaveBeenCalledWith("authenticated-player");
    expect(profileMocks.completeOnboarding).toHaveBeenCalledWith("authenticated-player");
  });

  it("rejects client-supplied onboarding state", async () => {
    const response = await request(app)
      .post("/auth/onboarding/complete")
      .set("Authorization", "test-token")
      .send({ onboarded: false, role: "King" });

    expect(response.status).toBe(400);
    expect(profileMocks.completeOnboarding).not.toHaveBeenCalled();
  });
});
