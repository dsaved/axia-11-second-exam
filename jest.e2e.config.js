export default {
  testEnvironment: "node",
  // Empty transform keeps Jest running our native ES modules without Babel.
  transform: {},
  // Only the e2e suites, which need a real MongoDB server.
  testMatch: ["**/tests/e2e/**/*.test.js"],
  setupFilesAfterEnv: ["<rootDir>/tests/e2e/setup.js"],
  testTimeout: 60000,
};
