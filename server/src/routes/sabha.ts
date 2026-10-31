import { Router } from "express";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { requireAuth } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { membershipsCollection } from "../services/memberships.js";

export const sabhaRouter = Router();

const announcementSchema = z.object({
  requestId: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(2000),
}).strict();

function validKingdomId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}

sabhaRouter.get("/kingdoms/:kingdomId/announcements", requireAuth, async (req, res) => {
  if (!validKingdomId(req.params.kingdomId)) {
    return res.status(400).json({ error: "invalid kingdom id" });
  }
  const clerkUserId = (req as any).auth.userId as string;
  const kingdomId = new ObjectId(req.params.kingdomId);
  const membership = await (await membershipsCollection()).findOne({
    kingdomId,
    clerkUserId,
  });
  if (!membership) return res.status(403).json({ error: "kingdom membership required" });

  const announcements = await getDb()
    .collection("sabhaAnnouncements")
    .find({ kingdomId })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  res.json({ announcements });
});

sabhaRouter.post("/kingdoms/:kingdomId/announcements", requireAuth, async (req, res) => {
  if (!validKingdomId(req.params.kingdomId)) {
    return res.status(400).json({ error: "invalid kingdom id" });
  }
  const parsed = announcementSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid announcement",
      details: parsed.error.flatten(),
    });
  }

  const clerkUserId = (req as any).auth.userId as string;
  const kingdomId = new ObjectId(req.params.kingdomId);
  const membership = await (await membershipsCollection()).findOne({
    kingdomId,
    clerkUserId,
  });
  if (!membership) return res.status(403).json({ error: "kingdom membership required" });
  if (membership.role === "Member") {
    return res.status(403).json({ error: "only kingdom leaders may publish announcements" });
  }

  const collection = getDb().collection("sabhaAnnouncements");
  await collection.createIndex(
    { kingdomId: 1, requestId: 1 },
    { unique: true },
  );
  const existing = await collection.findOne({
    kingdomId,
    requestId: parsed.data.requestId,
  });
  if (existing) {
    if (
      existing.clerkUserId !== clerkUserId ||
      existing.title !== parsed.data.title ||
      existing.body !== parsed.data.body
    ) {
      return res.status(409).json({ error: "request ID was already used for a different announcement" });
    }
    return res.json({ announcement: existing, duplicate: true });
  }

  const announcement = {
    kingdomId,
    requestId: parsed.data.requestId,
    clerkUserId,
    authorRole: membership.role,
    title: parsed.data.title,
    body: parsed.data.body,
    createdAt: new Date(),
  };
  try {
    await collection.insertOne(announcement);
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== 11000
    ) {
      throw error;
    }
    const concurrent = await collection.findOne({
      kingdomId,
      requestId: parsed.data.requestId,
    });
    if (!concurrent) throw error;
    if (
      concurrent.clerkUserId !== clerkUserId ||
      concurrent.title !== parsed.data.title ||
      concurrent.body !== parsed.data.body
    ) {
      return res.status(409).json({ error: "request ID was already used for a different announcement" });
    }
    return res.json({ announcement: concurrent, duplicate: true });
  }
  res.status(201).json({ announcement, duplicate: false });
});
