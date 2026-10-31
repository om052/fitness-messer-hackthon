import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { kingdomsCollection, polygonContains } from "../services/kingdoms.js";
import { membershipsCollection } from "../services/memberships.js";
import {
  createKingdomWithTerritory,
  upgradeKingdomBuilding,
} from "../services/kingdomClaims.js";
import { upsertProfile } from "../services/profiles.js";
import { getDb } from "../db.js";

export const kingdomsRouter = Router();

kingdomsRouter.get("/nearby", async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radius = Math.min(Number(req.query.radius || 5000), 20000);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180 || !Number.isFinite(radius) || radius <= 0) {
    return res.status(400).json({ error: "invalid coordinates or radius" });
  }
  const col = await kingdomsCollection();
  const results = await col.find({
    center: { $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: radius } },
  }).limit(50).toArray();
  res.json({ kingdoms: results });
});

kingdomsRouter.get("/mine", requireAuth, async (req, res) => {
  const userId = (req as any).auth.userId;
  const mcol = await membershipsCollection();
  const memberships = await mcol.find({ clerkUserId: userId }).toArray();
  const col = await kingdomsCollection();
  const ids = memberships.map((m) => m.kingdomId);
  const kingdoms = await col.find({ _id: { $in: ids } }).toArray();
  res.json({ memberships, kingdoms });
});

kingdomsRouter.get("/:id/members", async (req, res) => {
  const { ObjectId } = await import("mongodb");
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  const mcol = await membershipsCollection();
  const members = await mcol.find({ kingdomId: new ObjectId(req.params.id) }).toArray();
  res.json({ members });
});

/* ---------------- Atomic territory claim endpoint ---------------- */

const claimSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  lat: z.number().finite().min(-85).max(85),
  lng: z.number().finite().min(-180).max(180),
  territoryId: z.string().nullish(),
});

kingdomsRouter.post("/claim", requireAuth, async (req, res) => {
  const parsed = claimSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid claim request" });
  const userId = (req as any).auth.userId as string;
  if (parsed.data.territoryId) {
    return res.status(409).json({
      error: "selected territories cannot be claimed through this endpoint",
    });
  }
  const result = await createKingdomWithTerritory(getDb(), {
    clerkUserId: userId,
    name: parsed.data.name,
    description: parsed.data.description,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
  });
  if (result.kind === "conflict") {
    if ((result as any).reason === "already_in_kingdom") {
      return res.status(409).json({ error: "you can only belong to one kingdom" });
    }
    return res.status(409).json({ error: "territory overlaps an existing claim" });
  }
  if (result.kind !== "created") {
    return res.status(400).json({ error: "invalid territory geometry" });
  }
  res.status(201).json({ kingdom: result.kingdom });
});

/* ---------------- Fictional kingdom discovery endpoints ---------------- */

/**
 * GET /kingdoms/all — every kingdom doc (fictional + persisted) with
 * a `dataSource` marker distinguishing clearly the development seed records.
 */
kingdomsRouter.get("/all", async (req, res) => {
  const col = await kingdomsCollection();
  const docs = await col.find({}).limit(100).toArray();
  res.json({
    kingdoms: docs.map((d: any) => ({
      ...d,
      dataSource: d.isSample ? "fictional-seed" : "persisted",
    })),
  });
});

/**
 * POST /kingdoms/containing — identify the territory containing [lat, lng].
 * Server-side authoritative geometry + ownership; unknown → `unverified`.
 */
kingdomsRouter.post("/containing", async (req, res) => {
  const lat = Number(req.body?.lat);
  const lng = Number(req.body?.lng);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return res.status(400).json({ error: "invalid coordinates" });
  }
  const col = await kingdomsCollection();
  const docs = await col.find({
    territory: { $ne: null },
    center: { $near: { $geometry: { type: "Point", coordinates: [lng, lat] }, $maxDistance: 20000 } },
  }).limit(100).toArray();
  const hits = (docs as any[]).filter((d) => {
    const ring = d.territory?.coordinates?.[0];
    return ring && polygonContains(ring, lng, lat);
  });
  if (hits.length === 0) {
    return res.json({ territory: null, status: "outside-defined-territories" });
  }
  const h: any = hits[0];
  const verified = h.kingClerkUserId !== "system";
  res.json({
    territory: {
      seedId: h.seedId,
      kingdomName: h.name,
      isSample: h.isSample,
      dataSource: h.isSample ? "fictional-seed" : "persisted",
      status: verified ? "claimed" : "unverified",
    },
  });
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  lat: z.number().finite().min(-85).max(85),
  lng: z.number().finite().min(-180).max(180),
});

const upgradeSchema = z.object({ requestId: z.string().uuid() }).strict();

kingdomsRouter.post("/:id/buildings/:buildingId/upgrade", requireAuth, async (req, res) => {
  const { ObjectId } = await import("mongodb");
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ error: "invalid kingdom id" });
  }
  const parsed = upgradeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid upgrade request" });

  const clerkUserId = (req as any).auth.userId as string;
  const kingdomId = new ObjectId(req.params.id);
  const membership = await (await membershipsCollection()).findOne({
    kingdomId,
    clerkUserId,
  });
  if (!membership) return res.status(403).json({ error: "kingdom membership required" });

  const result = await upgradeKingdomBuilding(getDb(), {
    kingdomId,
    buildingId: req.params.buildingId,
    clerkUserId,
    requestId: parsed.data.requestId,
  });
  if (result.kind === "not_found") return res.status(404).json({ error: "kingdom not found" });
  if (result.kind === "sample_read_only") return res.status(403).json({ error: "sample kingdoms are read-only" });
  if (result.kind === "building_not_found") return res.status(404).json({ error: "building not found" });
  if (result.kind === "insufficient_progress") {
    return res.status(409).json({ error: "verified construction progress is required before upgrading" });
  }
  if (result.kind === "insufficient_treasury") {
    return res.status(409).json({ error: "kingdom treasury has insufficient funds" });
  }
  if (result.kind === "request_conflict") {
    return res.status(409).json({ error: "request ID was already used for a different operation" });
  }
  if (result.kind === "state_changed") {
    return res.status(409).json({ error: "building state changed; reload the kingdom and retry" });
  }
  return res.json({
    kingdom: result.kingdom,
    operation: result.operation,
    duplicate: result.kind === "duplicate",
  });
});

kingdomsRouter.get("/:id/membership", requireAuth, async (req, res) => {
  const { ObjectId } = await import("mongodb");
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  const membership = await (await membershipsCollection()).findOne({
    kingdomId: new ObjectId(req.params.id),
    clerkUserId: (req as any).auth.userId as string,
  });
  res.json({ membership: membership ? { role: membership.role } : null });
});

kingdomsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid kingdom details", details: parsed.error.flatten() });
  const userId = (req as any).auth.userId;
  await upsertProfile(userId);
  const result = await createKingdomWithTerritory(getDb(), {
    clerkUserId: userId,
    name: parsed.data.name,
    description: parsed.data.description,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
  });
  if (result.kind === "conflict") {
    if ((result as any).reason === "already_in_kingdom") {
      return res.status(409).json({ error: "you can only belong to one kingdom" });
    }
    return res.status(409).json({ error: "territory overlaps an existing claim" });
  }
  if (result.kind !== "created") {
    return res.status(400).json({ error: "invalid territory geometry" });
  }
  res.status(201).json({ kingdom: result.kingdom });
});

/* ---------------- Membership endpoints ---------------- */

/**
 * POST /kingdoms/:id/join — request membership in a kingdom.
 * Server-authoritative: rejects duplicates, sample kingdoms, and self-join.
 */
kingdomsRouter.post("/:id/join", requireAuth, async (req, res) => {
  const { ObjectId } = await import("mongodb");
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  const userId = (req as any).auth.userId as string;
  const col = await kingdomsCollection();
  const kingdom = await col.findOne({ _id: new ObjectId(req.params.id) });
  if (!kingdom) return res.status(404).json({ error: "kingdom not found" });
  if (kingdom.isSample) return res.status(409).json({ error: "sample kingdoms are not joinable" });
  if (kingdom.kingClerkUserId === userId) {
    return res.status(409).json({ error: "you already rule this kingdom" });
  }
  const mcol = await membershipsCollection();
  const existing = await mcol.findOne({ kingdomId: new ObjectId(req.params.id), clerkUserId: userId });
  if (existing) {
    return res.status(409).json({ error: "you are already a member", role: existing.role });
  }
  const now = new Date();
  let result;
  try {
    result = await mcol.insertOne({ kingdomId: new ObjectId(req.params.id), clerkUserId: userId, role: "Member", createdAt: now });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return res.status(409).json({ error: "you are already a member" });
    }
    throw error;
  }
  res.status(201).json({ membership: { _id: result.insertedId, kingdomId: kingdom._id, clerkUserId: userId, role: "Member", createdAt: now } });
});

/**
 * POST /kingdoms/:id/leave — leave a kingdom you belong to.
 * The founding king cannot leave their own kingdom through this endpoint.
 */
kingdomsRouter.post("/:id/leave", requireAuth, async (req, res) => {
  const { ObjectId } = await import("mongodb");
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  const userId = (req as any).auth.userId as string;
  const col = await kingdomsCollection();
  const kingdom = await col.findOne({ _id: new ObjectId(req.params.id) });
  if (!kingdom) return res.status(404).json({ error: "kingdom not found" });
  if (kingdom.kingClerkUserId === userId) {
    return res.status(409).json({ error: "the founding king cannot leave through this endpoint" });
  }
  const mcol = await membershipsCollection();
  const result = await mcol.deleteOne({ kingdomId: new ObjectId(req.params.id), clerkUserId: userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: "you are not a member of this kingdom" });
  res.json({ ok: true });
});

/* GET /:id — must be registered after named routes */
kingdomsRouter.get("/:id", async (req, res) => {
  const { ObjectId } = await import("mongodb");
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) {
    return res.status(400).json({ error: "invalid id" });
  }
  const col = await kingdomsCollection();
  const doc = await col.findOne({ _id: new ObjectId(req.params.id) });
  if (!doc) return res.status(404).json({ error: "not found" });
  res.json({ kingdom: doc });
});