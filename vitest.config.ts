import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  oxc: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    exclude: [...configDefaults.exclude],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      include: ["convex/**/*.ts", "components/**/*.tsx", "app/**/*.tsx"],
      exclude: [
        "convex/_generated/**",
        "convex/auth.config.ts",
        "**/*.test.ts",
        "**/*.test.tsx",
      ],
      // The org-wide 80% threshold is enforced at the pre-launch gate (AB#1254),
      // once real features + tests exist. Until then we collect/report coverage
      // without failing CI on a near-empty project.
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
