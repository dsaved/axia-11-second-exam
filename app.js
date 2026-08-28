import express from "express";

const app = express();

// Universal middleware that parses incoming JSON request bodies.
app.use(express.json());

// Simple health check confirming the API is up.
app.get("/", (req, res) => {
  return res.status(200).json({ message: "Axia 11 second exam API is running" });
});

export default app;
