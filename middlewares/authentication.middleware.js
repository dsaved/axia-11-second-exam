import jwt from "jsonwebtoken";
import userModel from "../models/users.model.js";
import { createError } from "../utils/error.util.js";

// Pulls the raw token out of an "Authorization: Bearer <token>" header.
const extractToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) return null;

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return authHeader.trim();
};

// Verifies the authentication token and puts the matching account on req.user.
const authenticationMiddleware = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw createError(401, "authentication token is required");
    }

    // A bad or expired token throws here and is classified by the error handler.
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Read the account fresh so req.user reflects the database, not a stale token.
    const user = await userModel.findById(payload.id);
    if (!user) {
      throw createError(401, "the user for this token no longer exists");
    }

    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch (error) {
    next(error);
  }
};

export default authenticationMiddleware;
