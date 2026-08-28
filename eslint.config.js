import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      // Express identifies error handlers by arity, so an unused next must stay.
      "no-unused-vars": [
        "error",
        { args: "after-used", argsIgnorePattern: "^_|^next$" },
      ],
      eqeqeq: ["error", "always"],
      "no-console": "off",
      "prefer-const": "error",
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
  },
];
