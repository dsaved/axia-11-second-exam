import express from "express";
import {
  registerUser,
  loginUser,
  getCurrentUser,
} from "../controllers/users.controller.js";
import authenticationMiddleware from "../middlewares/authentication.middleware.js";

const routes = express.Router();

routes.post("/auth/register", registerUser);

routes.post("/auth/login", loginUser);

// Protected route that proves req.user is populated after authentication.
routes.get("/auth/me", authenticationMiddleware, getCurrentUser);

export default routes;
