import jwt from "jsonwebtoken";
import userModel from "../models/users.model.js";
import {
  validateRegisterInput,
  validateLoginInput,
} from "../validators/auth.validator.js";

// Shapes a user document into the safe public form returned by the API.
const toPublicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

// Signs a JWT carrying the identity the authentication middleware will read back.
const generateToken = (user) =>
  jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

// Registers a new account after validating the payload and rejecting duplicate emails.
export const registerUser = async (req, res, next) => {
  try {
    const errors = validateRegisterInput(req.body);
    if (errors.length) {
      return res.status(400).json({ message: errors.join(", ") });
    }

    const { name, email, password } = req.body;
    const normalisedEmail = email.trim().toLowerCase();

    const existingUser = await userModel.findOne({ email: normalisedEmail });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "an account with this email already exists" });
    }

    const user = await userModel.create({
      name,
      email: normalisedEmail,
      password,
    });

    return res.status(201).json({
      message: "registration successful",
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// Verifies the submitted credentials and issues an authentication token.
export const loginUser = async (req, res, next) => {
  try {
    const errors = validateLoginInput(req.body);
    if (errors.length) {
      return res.status(400).json({ message: errors.join(", ") });
    }

    const { email, password } = req.body;

    // The password hash is select:false on the schema, so ask for it explicitly.
    const user = await userModel
      .findOne({ email: email.trim().toLowerCase() })
      .select("+password");

    // The same message covers both cases so we never reveal which emails exist.
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "invalid email or password" });
    }

    return res.status(200).json({
      message: "login successful",
      token: generateToken(user),
      user: toPublicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// Returns the account attached to the request by the authentication middleware.
export const getCurrentUser = (req, res) => {
  return res.status(200).json({ user: req.user });
};
