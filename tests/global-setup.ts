import { execSync } from "node:child_process";

/**
 * Aplica as migrations no banco de TESTE antes da suíte.
 * Use um banco exclusivo para testes (TEST_DATABASE_URL) — os testes de
 * integração apagam os dados entre um caso e outro.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://sady:sady@localhost:5432/sady_test?schema=public";
  if (!/test/i.test(url)) throw new Error("TEST_DATABASE_URL deve apontar para um banco de teste (o nome precisa conter 'test').");
  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
