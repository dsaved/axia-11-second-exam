export default {
  testEnvironment: "node",
  // Empty transform keeps Jest running our native ES modules without Babel.
  transform: {},
  // Only the top level suites; the e2e folder needs a real server and has its own config.
  testMatch: ["**/tests/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  // Booting the in-memory MongoDB on a cold cache can take a while.
  testTimeout: 60000,
};
