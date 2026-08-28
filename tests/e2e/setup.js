import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../../config/db.js";

dotenv.config();

const E2E_DBURL =
  process.env.E2E_DBURL || "mongodb://127.0.0.1:27017/axia-11-second-exam-e2e";

// Always point at the dedicated e2e database, never at the DBURL from .env.
process.env.DBURL = E2E_DBURL;
process.env.JWT_SECRET = process.env.JWT_SECRET || "e2e_jwt_secret";
process.env.JWT_EXPIRES_IN = "1h";

// This suite drops its database, so refuse to run against anything not named for testing.
const assertDisposableDatabase = () => {
  const databaseName = new URL(E2E_DBURL).pathname.replace("/", "");

  if (!/e2e|test/i.test(databaseName)) {
    throw new Error(
      `refusing to run e2e tests against "${databaseName}": the database name must contain "e2e" or "test"`,
    );
  }
};

// Opens a real MongoDB connection through the application's own helper.
beforeAll(async () => {
  assertDisposableDatabase();
  await connectDB();
});

// Clears every collection so each test starts from an empty database.
afterEach(async () => {
  const collections = mongoose.connection.collections;

  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

// Drops the whole e2e database and closes the connection.
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
