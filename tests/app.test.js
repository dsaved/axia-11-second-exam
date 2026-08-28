import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";

describe("Application setup", () => {
  // Confirms the Express app boots and answers the health check.
  it("responds to the health check route", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Axia 11 second exam API is running");
  });

  // Confirms the test harness is connected to the in-memory database.
  it("is connected to a test database", () => {
    expect(mongoose.connection.readyState).toBe(1);
  });
});
