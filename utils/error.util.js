// An error carrying the HTTP status the error-handling middleware should reply with.
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "AppError";
    this.status = status;
    // Marks errors we raised on purpose, as opposed to unexpected crashes.
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Shorthand for building an AppError to hand to next().
export const createError = (status, message) => new AppError(status, message);
