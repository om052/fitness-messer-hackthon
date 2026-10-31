import { Collection, Db } from "mongodb";
import { getDb } from "../db.js";

export interface MembershipDoc {
  kingdomId: any;
  clerkUserId: string;
  role: "King" | "Mantri" | "Senapati" | "Member";
  createdAt: Date;
}

export async function membershipsCollection(db: Db = getDb()) {
  const col = db.collection<MembershipDoc>("memberships");
  await col.createIndex({ kingdomId: 1, clerkUserId: 1 }, { unique: true });
  return col;
}