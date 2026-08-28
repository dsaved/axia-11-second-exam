const EMAIL_PATTERN = /^[^@\s]+@[^@\s.]+(?:\.[^@\s.]+)+$/;

// Applies the plaintext password strength rules before the value is hashed.
const validatePasswordStrength = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push("password must be at least 8 characters");
  }

  // bcrypt silently ignores anything past 72 bytes, so reject longer input outright.
  if (Buffer.byteLength(password, "utf8") > 72) {
    errors.push("password must not be longer than 72 bytes");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("password must contain at least one uppercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("password must contain at least one number");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("password must contain at least one special character");
  }

  return errors;
};

// Checks a registration payload and returns every problem found with it.
export const validateRegisterInput = (payload = {}) => {
  const { name, email, password } = payload;
  const errors = [];

  if (typeof name !== "string" || !name.trim()) {
    errors.push("name is required");
  }

  if (typeof email !== "string" || !email.trim()) {
    errors.push("email is required");
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.push("please provide a valid email address");
  }

  if (typeof password !== "string" || !password) {
    errors.push("password is required");
  } else {
    errors.push(...validatePasswordStrength(password));
  }

  return errors;
};

// Checks a login payload, which only needs both credentials to be present.
export const validateLoginInput = (payload = {}) => {
  const { email, password } = payload;
  const errors = [];

  if (typeof email !== "string" || !email.trim()) {
    errors.push("email is required");
  }

  if (typeof password !== "string" || !password) {
    errors.push("password is required");
  }

  return errors;
};
