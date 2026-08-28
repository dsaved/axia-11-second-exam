import mongoose from "mongoose";
import connectDB from "../../config/db.js";
import { E2E_DBURL } from "./e2e-config.js";

// Always point at the dedicated e2e database, never at the DBURL from .env.
process.env.DBURL = E2E_DBURL;
process.env.JWT_SECRET = process.env.JWT_SECRET || "e2e_jwt_secret";
process.env.JWT_EXPIRES_IN = "1h";

// Opens a real MongoDB connection through the application's own helper.
// Reachability was already proven by the global setup.
beforeAll(async () => {
  await connectDB({ serverSelectionTimeoutMS: 5000 });
});

// Clears every collection so each test starts from an empty database.
afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;

  const collections = mongoose.connection.collections;

  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

// Drops the whole e2e database and closes the connection.
afterAll(async () => {
  if (mongoose.connection.readyState !== 1) return;

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
