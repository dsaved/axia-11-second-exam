import dotenv from "dotenv";

dotenv.config();

export const E2E_DBURL =
  process.env.E2E_DBURL || "mongodb://127.0.0.1:27017/axia-11-second-exam-e2e";

// Reads the database name out of the connection string.
const databaseNameOf = (url) => {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    throw new Error(`E2E_DBURL is not a valid connection string: ${url}`);
  }
};

export const E2E_DATABASE_NAME = databaseNameOf(E2E_DBURL);

// This suite drops its database, so refuse to run against anything not named for
// testing. Checked as this module loads, so a bad target stops the run at once.
if (!/e2e|test/i.test(E2E_DATABASE_NAME)) {
  throw new Error(
    `refusing to run e2e tests against "${E2E_DATABASE_NAME}": the database name must contain "e2e" or "test"`,
  );
}
