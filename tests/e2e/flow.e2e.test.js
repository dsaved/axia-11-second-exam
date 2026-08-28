import request from "supertest";
import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import app from "../../app.js";
import connectDB from "../../config/db.js";
import userModel from "../../models/users.model.js";
import postModel from "../../models/post.model.js";

const credentials = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "Password1!",
};

describe("Database connection", () => {
  // Confirms the application's own connect helper opened a live connection.
  it("is connected to a real MongoDB server", async () => {
    expect(mongoose.connection.readyState).toBe(1);

    const ping = await mongoose.connection.db.admin().command({ ping: 1 });
    expect(ping.ok).toBe(1);
  });

  // Confirms we are talking to a real server process, not an in-memory stand-in.
  it("reports a server version", async () => {
    const info = await mongoose.connection.db
      .admin()
      .command({ buildInfo: 1 });

    expect(typeof info.version).toBe("string");
    expect(info.version.length).toBeGreaterThan(0);
  });

  // Confirms connectDB refuses to run without a connection string.
  it("refuses to connect when DBURL is missing", async () => {
    const original = process.env.DBURL;
    delete process.env.DBURL;

    await expect(connectDB()).rejects.toThrow(
      "DBURL is not defined, check your .env file",
    );

    process.env.DBURL = original;
  });

  // Confirms the unique index on email really exists in the database.
  it("builds the unique index on email", async () => {
    await userModel.init();

    const indexes = await mongoose.connection.db
      .collection("users")
      .indexes();
    const emailIndex = indexes.find((index) => index.key?.email === 1);

    expect(emailIndex).toBeDefined();
    expect(emailIndex.unique).toBe(true);
  });
});

describe("Register -> Login -> Token -> Protected route -> Create post", () => {
  beforeAll(async () => {
    await userModel.init();
  });

  // Walks the whole exam flow end to end against the real database.
  it("completes the full flow and persists the post to MongoDB", async () => {
    // 1. Register
    const registerResponse = await request(app)
      .post("/auth/register")
      .send(credentials);

    expect(registerResponse.status).toBe(201);
    const userId = registerResponse.body.user.id;

    // The account really landed in the database, with a hashed password.
    const storedUser = await mongoose.connection.db
      .collection("users")
      .findOne({ email: credentials.email });

    expect(storedUser).not.toBeNull();
    expect(storedUser._id).toBeInstanceOf(ObjectId);
    expect(storedUser.password).not.toBe(credentials.password);
    expect(storedUser.password).toMatch(/^\$2[aby]\$/);

    // 2. Login and receive a token
    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ email: credentials.email, password: credentials.password });

    expect(loginResponse.status).toBe(200);
    const token = loginResponse.body.token;
    expect(typeof token).toBe("string");

    // 3. The token opens a protected route and populates req.user
    const meResponse = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.user).toEqual({
      id: userId,
      name: credentials.name,
      email: credentials.email,
    });

    // 4. Create a post as that authenticated user
    const postResponse = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "My first post", description: "Hello world" });

    expect(postResponse.status).toBe(201);
    expect(postResponse.body.post.creatorId).toBe(userId);

    // 5. The post is really stored, owned by a genuine BSON ObjectId
    const storedPost = await mongoose.connection.db
      .collection("posts")
      .findOne({ title: "My first post" });

    expect(storedPost).not.toBeNull();
    expect(storedPost.creatorId).toBeInstanceOf(ObjectId);
    expect(storedPost.creatorId.toString()).toBe(userId);
    expect(storedPost.createdAt).toBeInstanceOf(Date);

    // 6. The reference resolves back to the account that created it
    const populated = await postModel
      .findById(storedPost._id)
      .populate("creatorId");

    expect(populated.creatorId.email).toBe(credentials.email);
  });

  // Confirms a creatorId sent by the client is ignored against a real database.
  it("ignores a creatorId supplied in the request body", async () => {
    await request(app).post("/auth/register").send(credentials);
    const login = await request(app)
      .post("/auth/login")
      .send({ email: credentials.email, password: credentials.password });

    const spoofedId = new mongoose.Types.ObjectId().toString();

    await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({
        title: "Spoof attempt",
        description: "creatorId should be ignored",
        creatorId: spoofedId,
      });

    const storedPost = await mongoose.connection.db
      .collection("posts")
      .findOne({ title: "Spoof attempt" });

    expect(storedPost.creatorId.toString()).toBe(login.body.user.id);
    expect(storedPost.creatorId.toString()).not.toBe(spoofedId);
  });

  // Confirms the protected route is closed without a token, and nothing is written.
  it("refuses to create a post without a token", async () => {
    const response = await request(app)
      .post("/posts")
      .send({ title: "No token", description: "Should not be saved" });

    expect(response.status).toBe(401);
    expect(await postModel.countDocuments()).toBe(0);
  });

  // Confirms the real unique index rejects a second account on the same email.
  it("refuses a duplicate registration", async () => {
    await request(app).post("/auth/register").send(credentials);

    const response = await request(app)
      .post("/auth/register")
      .send({ ...credentials, email: "ADA@example.com" });

    expect(response.status).toBe(409);
    expect(await userModel.countDocuments()).toBe(1);
  });

  // Confirms an unknown route still returns the json 404.
  it("returns a json 404 for an unknown route", async () => {
    const response = await request(app).get("/no-such-route");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("route GET /no-such-route not found");
  });
});
