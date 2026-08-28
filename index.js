import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

// Fails fast on a missing secret rather than at the first login attempt.
const requireEnv = () => {
  const missing = ["DBURL", "JWT_SECRET"].filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`missing environment variables: ${missing.join(", ")}`);
  }
};

// Connects to the database first, then starts listening for requests.
const startServer = async () => {
  try {
    requireEnv();
    await connectDB();
    app.listen(PORT, () => console.log(`app is running on port ${PORT}`));
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
