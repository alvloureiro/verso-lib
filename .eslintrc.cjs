/**
 * ESLint configuration for TypeScript.
 * Uses recommended TypeScript rules and Prettier (disables conflicting rules, runs as rule).
 */
module.exports = {
  root: true,
  env: { es2020: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "prettier"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier", // disables ESLint rules that conflict with Prettier
  ],
  rules: {
    "prettier/prettier": "error",
  },
  ignorePatterns: ["dist", "node_modules", "*.cjs"],
};
