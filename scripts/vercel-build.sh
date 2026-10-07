#!/usr/bin/env bash
# Build na Vercel: aplica as migrations, cria os dados iniciais (opcional) e compila.
#
# Variáveis:
#   DATABASE_URL            conexão do app (pode ser a "pooled" da Neon/Supabase)
#   DATABASE_URL_UNPOOLED   conexão direta para migrations (a integração Neon da Vercel cria esta)
#   SEED_ON_DEPLOY=1        cria usuários, configurações da loja e catálogo de demonstração
#   SEED_ADMIN_PASSWORD     senha do admin criado pelo seed (obrigatória com SEED_ON_DEPLOY)
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERRO: DATABASE_URL não configurada. Conecte um banco Postgres ao projeto (Storage → Neon) e faça o deploy de novo." >&2
  exit 1
fi

DIRECT_URL="${DATABASE_URL_UNPOOLED:-${POSTGRES_URL_NON_POOLING:-$DATABASE_URL}}"

echo "→ Aplicando migrations"
DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy

if [ "${SEED_ON_DEPLOY:-}" = "1" ]; then
  echo "→ Criando dados iniciais (SEED_ON_DEPLOY=1)"
  DATABASE_URL="$DIRECT_URL" SEED_FORCE=1 npm run db:seed
fi

echo "→ Compilando"
npx prisma generate
npx next build
