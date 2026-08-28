import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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

// Hashes the password before saving so plaintext never reaches the database.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compares a plaintext login attempt against this user's stored hash.
userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

const userModel = mongoose.model("user", userSchema);

export default userModel;
