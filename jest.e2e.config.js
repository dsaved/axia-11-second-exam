export default {
  testEnvironment: "node",
  // Empty transform keeps Jest running our native ES modules without Babel.
  transform: {},
  // Only the e2e suites, which need a real MongoDB server.
  testMatch: ["**/tests/e2e/**/*.test.js"],
  // Proves the database is reachable before any suite loads, so an unreachable
  // server aborts the run instead of timing out inside every hook.
  globalSetup: "<rootDir>/tests/e2e/global-setup.js",
  setupFilesAfterEnv: ["<rootDir>/tests/e2e/setup.js"],
  testTimeout: 30000,
};
