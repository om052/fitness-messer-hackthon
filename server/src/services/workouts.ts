import { Collection, Db } from "mongodb";
import { getDb } from "../db.js";
import type { WorkoutDoc } from "./workoutRules.js";

export async function workoutsCollection(db: Db = getDb()): Promise<Collection<WorkoutDoc>> {
  const col = db.collection<WorkoutDoc>("workouts");
  await col.createIndex({ clerkUserId: 1, sessionId: 1 }, { unique: true });
  await col.createIndex({ clerkUserId: 1, createdAt: -1 });
  return col;
}
