import app from "./app.js";
import { env } from "./config/env.js";

import {
  connectDatabase,
  disconnectDatabase,
} from "./config/database.js";

let server;
let isShuttingDown = false;

async function startServer() {
  try {
    // Connect to PostgreSQL first
    await connectDatabase();

    // Start Express
    server = app.listen(env.PORT, () => {
      console.log("----------------------------------");
      console.log("BizPilot AI Backend Started");
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Port: ${env.PORT}`);
      console.log(`API: http://localhost:${env.PORT}${env.API_PREFIX}`);
      console.log("----------------------------------");
    });
  } catch (error) {
    console.error("Failed to start BizPilot AI backend:", error);
    await disconnectDatabase().catch(() => {});
    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  if (isShuttingDown) return;

  isShuttingDown = true;
  console.log(`\n${signal} received. Shutting down...`);

  if (server) {
    server.close(async (error) => {
      if (error) {
        console.error("Error while closing server:", error);
        process.exitCode = 1;
      }

      try {
        await disconnectDatabase();
      } catch (disconnectError) {
        console.error("Database shutdown error:", disconnectError);
        process.exitCode = 1;
      }
    });
  } else {
    await disconnectDatabase().catch(console.error);
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

startServer();