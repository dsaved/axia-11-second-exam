import jwt from "jsonwebtoken";
import userModel from "../models/users.model.js";

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
      return res
        .status(401)
        .json({ message: "authentication token is required" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res
        .status(401)
        .json({ message: "authentication token is invalid or has expired" });
    }

    // Read the account fresh so req.user reflects the database, not a stale token.
    const user = await userModel.findById(payload.id);
    if (!user) {
      return res
        .status(401)
        .json({ message: "the user for this token no longer exists" });
    }

    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch (error) {
    next(error);
  }
};

export default authenticationMiddleware;
