import express from "express";
import usersRoute from "./routes/users.route.js";

const app = express();

// SECURITY: Stops Express from advertising itself in the X-Powered-By response header. 
app.disable("x-powered-by");

// Universal middleware that parses incoming JSON request bodies.
app.use(express.json());

// Simple health check confirming the API is up.
app.get("/", (req, res) => {
  return res.status(200).json({ message: "Axia 11 second exam API is running" });
});

app.use(usersRoute);

export default app;
