import mongoose from "mongoose";
import { E2E_DBURL } from "./e2e-config.js";

// Checks the server is reachable before any suite loads, so an unreachable
// database aborts the whole run in seconds instead of stalling in every hook.
const globalSetup = async () => {
  try {
    await mongoose.connect(E2E_DBURL, { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.db.admin().command({ ping: 1 });
  } catch (error) {
    throw new Error(
      `could not reach MongoDB at ${E2E_DBURL}\n` +
        `start a server (for example: brew services start mongodb-community) ` +
        `or set E2E_DBURL to one that is running.\n` +
        `original error: ${error.message}`,
      { cause: error },
    );
  } finally {
    await mongoose.disconnect();
  }
};

export default globalSetup;
