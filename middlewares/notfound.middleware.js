import { createError } from "../utils/error.util.js";

// Turns any request that matched no route into a 404 for the error handler.
const notFoundMiddleware = (req, res, next) => {
  next(createError(404, `route ${req.method} ${req.originalUrl} not found`));
};

export default notFoundMiddleware;
