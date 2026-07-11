import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    clearMocks: true,
    environment: "jsdom",
    globals: false,
    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}"],
    restoreMocks: true,
    setupFiles: ["./src/test/setup.js"],
  },
});
