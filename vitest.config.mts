import { defineConfig } from "vitest/config";
import path from "node:path";

const __dirname = import.meta.dirname;

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://sady:sady@localhost:5432/sady_test?schema=public";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/server-only-stub.ts") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: TEST_DATABASE_URL, AUTH_SECRET: "test-secret-test-secret-test-secret-0123" },
    // Testes de integração usam o mesmo banco e não podem rodar em paralelo entre arquivos
    fileParallelism: false,
    testTimeout: 30000,
  },
});
