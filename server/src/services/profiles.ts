import { Collection } from "mongodb";
import { getDb } from "../db.js";

export interface UserProfile {
  clerkUserId: string;
  displayName?: string;
  xp: number;
  strength: number;
  coins: number;
  avatarSeed?: string;
  onboarded?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function profilesCollection(): Promise<Collection<UserProfile>> {
  const db = getDb();
  const col = db.collection<UserProfile>("profiles");
  await col.createIndex({ clerkUserId: 1 }, { unique: true });
  return col;
}

export async function upsertProfile(clerkUserId: string, displayName?: string) {
  const col = await profilesCollection();
  const now = new Date();
  try {
    await col.updateOne(
      { clerkUserId },
      {
        $setOnInsert: {
          clerkUserId,
          displayName,
          xp: 0,
          strength: 0,
          coins: 0,
          onboarded: false,
          createdAt: now,
        },
        $set: { updatedAt: now, ...(displayName ? { displayName } : {}) },
      },
      { upsert: true },
    );
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== 11000
    ) {
      throw error;
    }
  }
  const profile = await col.findOne({ clerkUserId });
  if (!profile) throw new Error("Profile initialization did not produce a profile.");

  const missingProgress = Object.fromEntries(
    (["xp", "strength", "coins"] as const)
      .filter((key) => typeof profile[key] !== "number")
      .map((key) => [key, 0]),
  );
  if (Object.keys(missingProgress).length > 0) {
    await col.updateOne({ clerkUserId }, { $set: missingProgress });
    Object.assign(profile, missingProgress);
  }
  if (typeof profile.onboarded !== "boolean") {
    await col.updateOne({ clerkUserId }, { $set: { onboarded: false } });
    profile.onboarded = false;
  }
  return profile;
}

export async function updateProfile(
  clerkUserId: string,
  changes: Pick<UserProfile, "displayName" | "avatarSeed">,
) {
  const col = await profilesCollection();
  const result = await col.updateOne(
    { clerkUserId },
    { $set: { ...changes, updatedAt: new Date() } },
  );
  if (result.matchedCount !== 1) {
    throw new Error("Profile was not found after initialization.");
  }
  const profile = await col.findOne({ clerkUserId });
  if (!profile) throw new Error("Profile update did not produce a profile.");
  return profile;
}

export async function completeOnboarding(clerkUserId: string) {
  const col = await profilesCollection();
  const result = await col.updateOne(
    { clerkUserId },
    { $set: { onboarded: true, updatedAt: new Date() } },
  );
  if (result.matchedCount !== 1) {
    throw new Error("Profile was not found while completing onboarding.");
  }
  const profile = await col.findOne({ clerkUserId });
  if (!profile) throw new Error("Onboarding completion was not persisted.");
  return profile;
}