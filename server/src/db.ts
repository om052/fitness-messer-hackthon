import { MongoClient, Db } from "mongodb";
import { env } from "./app.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb() {
  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  db = client.db();
  return db;
}

export async function disconnectDb() {
  await client?.close();
  client = null;
  db = null;
}

export async function pingDb() {
  if (!db) throw new Error("Database not connected");
  await db.command({ ping: 1 });
  return true;
}

export function getDb() {
  if (!db) throw new Error("Database not connected");
  return db;
}
