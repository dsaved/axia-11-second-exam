import express from "express";
import usersRoute from "./routes/users.route.js";
import postRoute from "./routes/post.route.js";
import notFoundMiddleware from "./middlewares/notfound.middleware.js";
import errorHandlingMiddleware from "./middlewares/errorhandling.middleware.js";

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
app.use(postRoute);

// Anything that matched no route above becomes a 404.
app.use(notFoundMiddleware);

// Error-handling middleware must be mounted last so every next(error) reaches it.
app.use(errorHandlingMiddleware);

export default app;
