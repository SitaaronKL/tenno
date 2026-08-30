import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const alias = { "@": resolve(__dirname, ".") };
const exclude = ["node_modules/**", ".next/**"];

// Two runtimes: the UI needs a DOM, Convex functions need the edge runtime convex-test expects.
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "ui",
          environment: "jsdom",
          globals: true,
          setupFiles: ["./vitest.setup.ts"],
          include: ["**/*.test.tsx"],
          exclude,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "convex",
          environment: "edge-runtime",
          globals: true,
          include: ["convex/**/*.test.ts"],
          exclude,
          server: { deps: { inline: ["convex-test"] } },
        },
      },
    ],
  },
});
