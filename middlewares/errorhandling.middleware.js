import mongoose from "mongoose";

// Translates a known error into the status and message the client should see.
const describeError = (error) => {
  // Mongoose refused the document, so report every field problem at once.
  if (error instanceof mongoose.Error.ValidationError) {
    const message = Object.values(error.errors)
      .map((fieldError) => fieldError.message)
      .join(", ");

    return { status: 400, message };
  }

  // A value could not be cast to its schema type, such as a malformed ObjectId.
  if (error instanceof mongoose.Error.CastError) {
    return { status: 400, message: `${error.path} must be a valid ${error.kind}` };
  }

  // A unique index rejected the write.
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0] ?? "value";
    return { status: 409, message: `that ${field} is already taken` };
  }

  if (error.name === "TokenExpiredError") {
    return { status: 401, message: "authentication token has expired" };
  }

  if (error.name === "JsonWebTokenError") {
    return { status: 401, message: "authentication token is invalid" };
  }

  // express.json() could not parse the request body.
  if (error.type === "entity.parse.failed") {
    return { status: 400, message: "request body must be valid JSON" };
  }

  return {
    status: error.status ?? error.statusCode ?? 500,
    message: error.message || "Server error",
  };
};

// Central error-handling middleware, the last handler mounted on the app.
const errorHandlingMiddleware = (error, req, res, next) => {
  const { status, message } = describeError(error);

  // Unexpected failures are logged in full but never described to the client.
  if (status >= 500) {
    if (process.env.NODE_ENV !== "test") console.error(error);

    return res.status(status).json({ message: "Server error" });
  }

  return res.status(status).json({ message });
};

export default errorHandlingMiddleware;
