import { jest } from "@jest/globals";
import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import app from "../app.js";
import errorHandlingMiddleware from "../middlewares/errorhandling.middleware.js";
import notFoundMiddleware from "../middlewares/notfound.middleware.js";
import { AppError, createError } from "../utils/error.util.js";
import userModel from "../models/users.model.js";

// Builds a throwaway app whose single route throws the supplied error.
const appThatThrows = (error) => {
  const testApp = express();

  testApp.get("/boom", (req, res, next) => next(error));
  testApp.use(errorHandlingMiddleware);

  return testApp;
};

describe("createError", () => {
  // Confirms the helper produces a real Error carrying an HTTP status.
  it("builds an AppError with a status and message", () => {
    const error = createError(403, "forbidden");

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(403);
    expect(error.message).toBe("forbidden");
    expect(error.isOperational).toBe(true);
  });
});

describe("Not found middleware", () => {
  // Confirms an unmatched route produces a 404 rather than an HTML page.
  it("returns 404 for an unknown route", async () => {
    const response = await request(app).get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("route GET /does-not-exist not found");
  });

  // Confirms the method is reported too, so a wrong verb is easy to spot.
  it("reports the method of the unmatched route", async () => {
    const response = await request(app).delete("/posts");

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("route DELETE /posts not found");
  });

  // Confirms the middleware forwards rather than answering directly.
  it("passes a 404 AppError to next", () => {
    const next = jest.fn();
    notFoundMiddleware(
      { method: "GET", originalUrl: "/nope" },
      {},
      next,
    );

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(404);
  });
});

describe("Error-handling middleware", () => {
  // Confirms an AppError is answered with its own status and message.
  it("uses the status carried by an AppError", async () => {
    const response = await request(appThatThrows(createError(403, "forbidden"))).get(
      "/boom",
    );

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("forbidden");
  });

  // Confirms an unexpected error becomes a 500 without leaking internals.
  it("hides the details of an unexpected error", async () => {
    const response = await request(
      appThatThrows(new Error("connection string leaked here")),
    ).get("/boom");

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Server error");
    expect(JSON.stringify(response.body)).not.toContain("leaked");
  });

  // Confirms a mongoose validation error reports every field at once.
  it("turns a mongoose validation error into a 400", async () => {
    const validationError = await new userModel({}).validate().catch((e) => e);

    const response = await request(appThatThrows(validationError)).get("/boom");

    expect(response.status).toBe(400);
    expect(response.body.message).toContain("name is required");
    expect(response.body.message).toContain("email is required");
    expect(response.body.message).toContain("password is required");
  });

  // Confirms a bad ObjectId is reported as a bad request, not a crash.
  it("turns a cast error into a 400", async () => {
    const castError = await userModel.findById("not-an-id").catch((e) => e);

    const response = await request(appThatThrows(castError)).get("/boom");

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("_id must be a valid ObjectId");
  });

  // Confirms a duplicate key violation is reported as a conflict.
  it("turns a duplicate key error into a 409", async () => {
    const duplicateError = Object.assign(new Error("E11000 duplicate key"), {
      code: 11000,
      keyPattern: { email: 1 },
    });

    const response = await request(appThatThrows(duplicateError)).get("/boom");

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("that email is already taken");
  });

  // Confirms jwt failures are classified as unauthorised.
  it("turns jwt errors into a 401", async () => {
    const invalid = Object.assign(new Error("jwt malformed"), {
      name: "JsonWebTokenError",
    });
    const expired = Object.assign(new Error("jwt expired"), {
      name: "TokenExpiredError",
    });

    const invalidResponse = await request(appThatThrows(invalid)).get("/boom");
    const expiredResponse = await request(appThatThrows(expired)).get("/boom");

    expect(invalidResponse.status).toBe(401);
    expect(invalidResponse.body.message).toBe("authentication token is invalid");
    expect(expiredResponse.status).toBe(401);
    expect(expiredResponse.body.message).toBe("authentication token has expired");
  });

  // Confirms a malformed JSON body is reported clearly.
  it("turns unparsable JSON into a 400", async () => {
    const response = await request(app)
      .post("/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": "ada@example.com",}');

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("request body must be valid JSON");
  });
});

describe("Errors reaching the middleware from real routes", () => {
  // Confirms controller validation failures are answered as JSON, not HTML.
  it("answers a failed registration with a json 400", async () => {
    const response = await request(app).post("/auth/register").send({});

    expect(response.status).toBe(400);
    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.body.message).toContain("name is required");
  });

  // Confirms an unexpected database failure is caught and reported as a 500.
  it("catches an unexpected failure in a controller", async () => {
    // findOne is chained with .select(), so stand in a query that rejects.
    const findOne = jest.spyOn(userModel, "findOne").mockReturnValueOnce({
      select: () => Promise.reject(new Error("database is down")),
    });

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "ada@example.com", password: "Password1!" });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Server error");
    expect(JSON.stringify(response.body)).not.toContain("database is down");

    findOne.mockRestore();
  });

  // Confirms an error thrown inside the auth middleware is handled the same way.
  it("catches an unexpected failure in the authentication middleware", async () => {
    const findById = jest
      .spyOn(userModel, "findById")
      .mockRejectedValueOnce(new Error("database is down"));

    const token = (
      await request(app)
        .post("/auth/register")
        .send({
          name: "Ada",
          email: "ada@example.com",
          password: "Password1!",
        })
        .then(() =>
          request(app)
            .post("/auth/login")
            .send({ email: "ada@example.com", password: "Password1!" }),
        )
    ).body.token;

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(500);
    expect(response.body.message).toBe("Server error");

    findById.mockRestore();
  });

  // Confirms mongoose ids are still usable after the error paths above.
  it("leaves the database usable after handled errors", async () => {
    const user = await userModel.create({
      name: "Ada",
      email: "ada@example.com",
      password: "Password1!",
    });

    expect(mongoose.isValidObjectId(user.id)).toBe(true);
  });
});
