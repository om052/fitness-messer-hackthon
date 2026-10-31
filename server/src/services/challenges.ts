import { Collection } from "mongodb";
import { getDb } from "../db.js";

export interface ChallengeDoc {
  requestId?: string;
  kingdomId: any;
  challengerId: string;
  challengerName?: string;
  defenderId: string;
  defenderName?: string;
  challengerKingdomId?: any;
  defenderKingdomId?: any;
  type: "leadership" | "training" | "senapati";
  exerciseId: string;
  timeLimitMin: number;
  status: "pending" | "active" | "agreed" | "resolved" | "cancelled";
  agreedExercise?: string;
  agreedTimeLimitMin?: number;
  agreedAt?: Date;
  challengerAcceptedAt?: Date;
  defenderAcceptedAt?: Date;
  verifiedResult?: {
    result: string;
    outcome: string;
    verifiedAt: Date;
  };
  result?: string;
  outcome?: string;
  rules?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function challengesCollection(): Promise<Collection<ChallengeDoc>> {
  const db = getDb();
  const col = db.collection<ChallengeDoc>("challenges");
  await col.createIndex({ kingdomId: 1 });
  await col.createIndex({ kingdomId: 1, requestId: 1 }, { unique: true, sparse: true });
  await col.createIndex({ challengerId: 1 });
  await col.createIndex({ defenderId: 1 });
  return col;
}
