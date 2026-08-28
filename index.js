import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

// Connects to the database first, then starts listening for requests.
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`app is running on port ${PORT}`));
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
