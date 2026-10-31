import { connectDb } from "./db.js";
import { seedDemoKingdoms, seedFictionalKingdoms } from "./services/kingdoms.js";
await connectDb();
await seedDemoKingdoms();
await seedFictionalKingdoms();
console.log("seeded");
process.exit(0);