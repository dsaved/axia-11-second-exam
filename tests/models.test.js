import mongoose from "mongoose";
import userModel from "../models/users.model.js";
import postModel from "../models/post.model.js";

describe("User model", () => {
  // Builds the unique index once so duplicate email tests are reliable.
  beforeAll(async () => {
    await userModel.init();
  });

  // Confirms a complete user document saves successfully.
  it("saves a valid user", async () => {
    const user = await userModel.create({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "hashed_password_placeholder",
    });

    expect(user._id).toBeDefined();
    expect(user.name).toBe("Ada Lovelace");
    expect(user.createdAt).toBeInstanceOf(Date);
  });

  // Confirms name, email and password are all mandatory.
  it("rejects a user that is missing required fields", async () => {
    const error = await userModel.create({}).catch((err) => err);

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error.errors.name).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.password).toBeDefined();
  });

  // Confirms a malformed email address is rejected by the schema.
  it("rejects an invalid email address", async () => {
    const error = await userModel
      .create({ name: "Ada", email: "not-an-email", password: "hash" })
      .catch((err) => err);

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error.errors.email.message).toBe(
      "please provide a valid email address",
    );
  });

  // Confirms email is normalised to lowercase and trimmed before saving.
  it("normalises the email address", async () => {
    const user = await userModel.create({
      name: "  Ada  ",
      email: "  ADA@EXAMPLE.COM  ",
      password: "hash",
    });

    expect(user.email).toBe("ada@example.com");
    expect(user.name).toBe("Ada");
  });

  // Confirms two accounts cannot share the same email address.
  it("rejects a duplicate email address", async () => {
    await userModel.create({
      name: "Ada",
      email: "ada@example.com",
      password: "hash",
    });

    const error = await userModel
      .create({ name: "Grace", email: "ada@example.com", password: "hash" })
      .catch((err) => err);

    expect(error.code).toBe(11000);
  });

  // Confirms the password hash is hidden from ordinary queries.
  it("does not return the password by default", async () => {
    await userModel.create({
      name: "Ada",
      email: "ada@example.com",
      password: "Password1!",
    });

    const found = await userModel.findOne({ email: "ada@example.com" });
    const withPassword = await userModel
      .findOne({ email: "ada@example.com" })
      .select("+password");

    expect(found.password).toBeUndefined();
    expect(withPassword.password).toBeDefined();
  });
});

describe("Post model", () => {
  const creatorId = new mongoose.Types.ObjectId();

  // Confirms a complete post document saves successfully.
  it("saves a valid post", async () => {
    const post = await postModel.create({
      title: "My first post",
      description: "Something worth reading",
      creatorId,
    });

    expect(post._id).toBeDefined();
    expect(post.creatorId).toEqual(creatorId);
    expect(post.createdAt).toBeInstanceOf(Date);
  });

  // Confirms title, description and creatorId are all mandatory.
  it("rejects a post that is missing required fields", async () => {
    const error = await postModel.create({}).catch((err) => err);

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error.errors.title).toBeDefined();
    expect(error.errors.description).toBeDefined();
    expect(error.errors.creatorId.message).toBe("creatorId is required");
  });

  // Confirms creatorId is stored as an ObjectId as required by the task.
  it("stores creatorId as an ObjectId", async () => {
    const post = await postModel.create({
      title: "Typed reference",
      description: "creatorId must be an ObjectId",
      creatorId: creatorId.toString(),
    });

    expect(postModel.schema.path("creatorId").instance).toBe("ObjectId");
    expect(post.creatorId).toBeInstanceOf(mongoose.Types.ObjectId);
  });

  // Confirms a value that is not a valid ObjectId is rejected.
  it("rejects a creatorId that is not a valid ObjectId", async () => {
    const error = await postModel
      .create({ title: "Bad", description: "Bad owner", creatorId: "abc" })
      .catch((err) => err);

    expect(error).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(error.errors.creatorId).toBeInstanceOf(mongoose.Error.CastError);
  });

  // Confirms the post can be populated back to the user that created it.
  it("references the user collection through creatorId", async () => {
    const user = await userModel.create({
      name: "Ada",
      email: "ada@example.com",
      password: "hash",
    });
    const created = await postModel.create({
      title: "Owned post",
      description: "Belongs to Ada",
      creatorId: user._id,
    });

    const populated = await postModel
      .findById(created._id)
      .populate("creatorId");

    expect(populated.creatorId.email).toBe("ada@example.com");
  });
});
