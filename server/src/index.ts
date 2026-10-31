import { createApp, env } from "./app.js";
import { connectDb, disconnectDb } from "./db.js";

const app = createApp();

async function main() {
  try {
    await connectDb();
    console.log("MongoDB connected");
  } catch {
    console.error("MongoDB connection failed. Server startup aborted.");
    process.exitCode = 1;
    return;
  }
  const server = app.listen(env.PORT, () => console.log(`Server on ${env.PORT}`));
  const shutdown = async () => {
    server.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();