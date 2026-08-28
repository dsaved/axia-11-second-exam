import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import app from "../app.js";
import userModel from "../models/users.model.js";
import {
  validateRegisterInput,
  validateLoginInput,
} from "../validators/auth.validator.js";

const validUser = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  password: "Password1!",
};

// Registers and logs in a user, returning the issued authentication token.
const registerAndLogin = async (overrides = {}) => {
  const credentials = { ...validUser, ...overrides };
  await request(app).post("/auth/register").send(credentials);

  const response = await request(app)
    .post("/auth/login")
    .send({ email: credentials.email, password: credentials.password });

  return response.body.token;
};

describe("Registration validator", () => {
  // Confirms a well formed payload produces no complaints.
  it("accepts a valid payload", () => {
    expect(validateRegisterInput(validUser)).toEqual([]);
  });

  // Confirms every missing field is reported at once.
  it("reports all missing fields", () => {
    const errors = validateRegisterInput({});

    expect(errors).toContain("name is required");
    expect(errors).toContain("email is required");
    expect(errors).toContain("password is required");
  });

  // Confirms the password strength rules are enforced on the plaintext.
  it("enforces uppercase, number and special character rules", () => {
    const errors = validateRegisterInput({ ...validUser, password: "password" });

    expect(errors).toContain("password must contain at least one uppercase letter");
    expect(errors).toContain("password must contain at least one number");
    expect(errors).toContain("password must contain at least one special character");
  });

  // Confirms short passwords are rejected.
  it("enforces the minimum password length", () => {
    const errors = validateRegisterInput({ ...validUser, password: "Ab1!" });

    expect(errors).toContain("password must be at least 8 characters");
  });

  // Confirms login only requires both credentials to be present.
  it("checks login credentials are supplied", () => {
    expect(validateLoginInput({})).toEqual([
      "email is required",
      "password is required",
    ]);
    expect(validateLoginInput(validUser)).toEqual([]);
  });
});

describe("POST /auth/register", () => {
  beforeAll(async () => {
    await userModel.init();
  });

  // Confirms a new account is created and no password is echoed back.
  it("registers a new user", async () => {
    const response = await request(app).post("/auth/register").send(validUser);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("registration successful");
    expect(response.body.user.email).toBe("ada@example.com");
    expect(response.body.user.password).toBeUndefined();
    expect(mongoose.isValidObjectId(response.body.user.id)).toBe(true);
  });

  // Confirms the stored password is a hash and not the plaintext.
  it("stores the password as a bcrypt hash", async () => {
    await request(app).post("/auth/register").send(validUser);

    const user = await userModel
      .findOne({ email: validUser.email })
      .select("+password");

    expect(user.password).not.toBe(validUser.password);
    expect(user.password).toMatch(/^\$2[aby]\$/);
    expect(await user.comparePassword(validUser.password)).toBe(true);
  });

  // Confirms a weak password never reaches the database.
  it("rejects a weak password", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({ ...validUser, password: "password" });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("uppercase");
    expect(await userModel.countDocuments()).toBe(0);
  });

  // Confirms the same email cannot be registered twice.
  it("rejects a duplicate email", async () => {
    await request(app).post("/auth/register").send(validUser);

    const response = await request(app)
      .post("/auth/register")
      .send({ ...validUser, email: "ADA@example.com" });

    expect(response.status).toBe(409);
    expect(response.body.message).toBe(
      "an account with this email already exists",
    );
  });
});

describe("POST /auth/login", () => {
  // Confirms valid credentials return a usable token.
  it("logs a registered user in and returns a token", async () => {
    await request(app).post("/auth/register").send(validUser);

    const response = await request(app)
      .post("/auth/login")
      .send({ email: validUser.email, password: validUser.password });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("login successful");
    expect(typeof response.body.token).toBe("string");

    const payload = jwt.verify(response.body.token, process.env.JWT_SECRET);
    expect(payload.email).toBe(validUser.email);
    expect(payload.id).toBe(response.body.user.id);
  });

  // Confirms a wrong password is refused without revealing which field was wrong.
  it("rejects an incorrect password", async () => {
    await request(app).post("/auth/register").send(validUser);

    const response = await request(app)
      .post("/auth/login")
      .send({ email: validUser.email, password: "WrongPassword1!" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("invalid email or password");
    expect(response.body.token).toBeUndefined();
  });

  // Confirms an unknown email gets the same answer as a wrong password.
  it("rejects an unknown email with the same message", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "Password1!" });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("invalid email or password");
  });

  // Confirms missing credentials are reported as a bad request.
  it("rejects missing credentials", async () => {
    const response = await request(app).post("/auth/login").send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("email is required, password is required");
  });
});

describe("Authentication middleware", () => {
  // Confirms a valid token populates req.user with the account details.
  it("populates req.user for a valid token", async () => {
    const token = await registerAndLogin();

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe(validUser.email);
    expect(response.body.user.name).toBe(validUser.name);
    expect(mongoose.isValidObjectId(response.body.user.id)).toBe(true);
    expect(response.body.user.password).toBeUndefined();
  });

  // Confirms the header also works without the "Bearer " prefix.
  it("accepts a raw token without the Bearer prefix", async () => {
    const token = await registerAndLogin();

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", token);

    expect(response.status).toBe(200);
  });

  // Confirms a request with no token is refused.
  it("rejects a request with no token", async () => {
    const response = await request(app).get("/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("authentication token is required");
  });

  // Confirms a tampered token is refused.
  it("rejects an invalid token", async () => {
    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer not.a.real.token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("authentication token is invalid");
  });

  // Confirms a token signed with the wrong secret is refused.
  it("rejects a token signed with a different secret", async () => {
    const token = jwt.sign(
      { id: new mongoose.Types.ObjectId().toString() },
      "some_other_secret",
    );

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  // Confirms an expired token is refused.
  it("rejects an expired token", async () => {
    const token = jwt.sign(
      { id: new mongoose.Types.ObjectId().toString() },
      process.env.JWT_SECRET,
      { expiresIn: "-1s" },
    );

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("authentication token has expired");
  });

  // Confirms a valid token for a deleted account is refused.
  it("rejects a token whose user no longer exists", async () => {
    const token = await registerAndLogin();
    await userModel.deleteMany({});

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.message).toBe(
      "the user for this token no longer exists",
    );
  });
});
