import mongoose from "mongoose";

// Opens the MongoDB connection used by the application at startup.
const connectDB = async () => {
  const dbUrl = process.env.DBURL;

  if (!dbUrl) {
    throw new Error("DBURL is not defined, check your .env file");
  }

  await mongoose.connect(dbUrl);
  console.log("DB connected");

  return mongoose.connection;
};

export default connectDB;
