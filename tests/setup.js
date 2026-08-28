import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer;

// Test secrets so the suite never depends on a real .env file.
process.env.JWT_SECRET = "test_jwt_secret";
process.env.JWT_EXPIRES_IN = "1h";

// Spins up a throwaway in-memory MongoDB and connects mongoose to it.
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

// Clears every collection so each test starts from an empty database.
afterEach(async () => {
  const collections = mongoose.connection.collections;

  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

// Closes the connection and shuts the in-memory server down.
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});
