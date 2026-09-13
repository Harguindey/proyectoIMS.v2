import { defineConfig } from "vitest/config";
import path from "path";

const root = process.cwd();

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(root, "shared"),
      "@": path.resolve(root, "client/src"),
      "@assets": path.resolve(root, "attached_assets"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    // Los tests comparten una única base de datos: ejecutarlos en serie
    // evita colisiones de estado entre archivos.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres@localhost:5433/logipro_vitest",
      SESSION_SECRET: process.env.SESSION_SECRET || "test_secret_at_least_32_characters_long_000",
      NODE_ENV: "test",
    },
  },
});
