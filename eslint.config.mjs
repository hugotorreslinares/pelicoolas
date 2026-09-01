// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist/**", ".astro/**", ".vercel/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      // Only the classic, stable rules — eslint-plugin-react-hooks v7's "recommended"
      // config also ships experimental React Compiler diagnostics (set-state-in-effect,
      // immutability, purity, ...) that flag idiomatic external-sync effects (Firebase
      // listeners, fetch-on-mount) as errors. Too aggressive for this codebase.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      ...jsxA11y.configs.recommended.rules,
      // base-ui's `render={<a href="..." />}` prop injects children at runtime;
      // jsx-a11y can't see that and false-positives on every occurrence.
      "jsx-a11y/anchor-has-content": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      // TypeScript (via astro check) already catches undefined identifiers, more
      // accurately — no-undef false-positives on ambient globals (declare const) and TS types.
      "no-undef": "off",
    },
  },
  {
    // Astro frontmatter is parsed as TS by eslint-plugin-astro; script-side JSX rules don't apply there.
    files: ["**/*.astro"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "no-undef": "off",
    },
  },
  {
    // Astro's generated env.d.ts requires a triple-slash reference to .astro/types.d.ts —
    // that's the framework's own convention, not something to lint against.
    files: ["**/env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
  eslintConfigPrettier,
);
