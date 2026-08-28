import express from "express";
import { createPost } from "../controllers/post.controller.js";
import authenticationMiddleware from "../middlewares/authentication.middleware.js";

const routes = express.Router();

// Route specific middleware keeps post creation behind authentication.
routes.post("/posts", authenticationMiddleware, createPost);

export default routes;
