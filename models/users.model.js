import mongoose from "mongoose";

// Describes the shape of a user document in MongoDB.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/, "please provide a valid email address"],
    },
    password: {
      // Only ever holds the bcrypt hash, so strength rules live in the request validator.
      type: String,
      required: [true, "password is required"],
      // Never returned by a query unless explicitly asked for with .select("+password").
      select: false,
    },
  },
  { timestamps: true },
);

const userModel = mongoose.model("user", userSchema);

export default userModel;
