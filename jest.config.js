export default {
  testEnvironment: "node",
  // Empty transform keeps Jest running our native ES modules without Babel.
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  // Booting the in-memory MongoDB on a cold cache can take a while.
  testTimeout: 60000,
};
