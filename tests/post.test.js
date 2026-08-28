import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import postModel from "../models/post.model.js";
import { validateCreatePostInput } from "../validators/post.validator.js";

const validUser = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "Password1!",
};

const validPost = {
  title: "My first post",
  description: "Something worth reading",
};

// Registers and logs in a user, returning both the token and the account id.
const authenticate = async (overrides = {}) => {
  const credentials = { ...validUser, ...overrides };
  await request(app).post("/auth/register").send(credentials);

  const response = await request(app)
    .post("/auth/login")
    .send({ email: credentials.email, password: credentials.password });

  return { token: response.body.token, userId: response.body.user.id };
};

describe("Create post validator", () => {
  // Confirms a well formed payload produces no complaints.
  it("accepts a valid payload", () => {
    expect(validateCreatePostInput(validPost)).toEqual([]);
  });

  // Confirms both fields are reported when the payload is empty.
  it("reports missing fields", () => {
    expect(validateCreatePostInput({})).toEqual([
      "title is required",
      "description is required",
    ]);
  });

  // Confirms whitespace only values are treated as missing.
  it("rejects whitespace only values", () => {
    expect(validateCreatePostInput({ title: "   ", description: "  " })).toEqual(
      ["title is required", "description is required"],
    );
  });
});

describe("POST /posts", () => {
  // Confirms an authenticated user can create a post.
  it("creates a post for the authenticated user", async () => {
    const { token, userId } = await authenticate();

    const response = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send(validPost);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("post created successfully");
    expect(response.body.post.title).toBe(validPost.title);
    expect(response.body.post.description).toBe(validPost.description);
    expect(response.body.post.creatorId).toBe(userId);
  });

  // Confirms the saved document carries the creator as a real ObjectId.
  it("saves creatorId from req.user as an ObjectId", async () => {
    const { token, userId } = await authenticate();

    await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send(validPost);

    const post = await postModel.findOne({ title: validPost.title });

    expect(post.creatorId).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(post.creatorId.toString()).toBe(userId);
  });

  // Confirms a creatorId sent in the body cannot override the token identity.
  it("ignores a creatorId supplied in the request body", async () => {
    const { token, userId } = await authenticate();
    const spoofedId = new mongoose.Types.ObjectId().toString();

    const response = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validPost, creatorId: spoofedId });

    expect(response.status).toBe(201);
    expect(response.body.post.creatorId).toBe(userId);
    expect(response.body.post.creatorId).not.toBe(spoofedId);
  });

  // Confirms each user's posts are attributed to that user only.
  it("attributes posts to whichever user is authenticated", async () => {
    const ada = await authenticate();
    const grace = await authenticate({
      name: "Grace Hopper",
      email: "grace@example.com",
    });

    await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${ada.token}`)
      .send({ title: "Ada post", description: "By Ada" });

    await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${grace.token}`)
      .send({ title: "Grace post", description: "By Grace" });

    const adaPost = await postModel
      .findOne({ title: "Ada post" })
      .populate("creatorId");
    const gracePost = await postModel
      .findOne({ title: "Grace post" })
      .populate("creatorId");

    expect(adaPost.creatorId.email).toBe("ada@example.com");
    expect(gracePost.creatorId.email).toBe("grace@example.com");
  });

  // Confirms the route is closed to unauthenticated callers.
  it("rejects a request with no token", async () => {
    const response = await request(app).post("/posts").send(validPost);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("authentication token is required");
    expect(await postModel.countDocuments()).toBe(0);
  });

  // Confirms a tampered token cannot create a post.
  it("rejects a request with an invalid token", async () => {
    const response = await request(app)
      .post("/posts")
      .set("Authorization", "Bearer not.a.real.token")
      .send(validPost);

    expect(response.status).toBe(401);
    expect(await postModel.countDocuments()).toBe(0);
  });

  // Confirms an authenticated request still needs a valid payload.
  it("rejects a post with missing fields", async () => {
    const { token } = await authenticate();

    const response = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "title is required, description is required",
    );
    expect(await postModel.countDocuments()).toBe(0);
  });
});
