@AGENTS.md

# Sady Roupas — convenções

- Regras de negócio ficam em `src/services`; páginas, Server Actions e rotas de API só chamam serviços.
- Toda Server Action/rota do painel começa com `requireUser(permissão)`; páginas com `requirePageUser`.
- Operações críticas usam `db.$transaction` e registram `AuditService.log` na mesma transação.
- WhatsApp e impressão nunca bloqueiam a operação principal: grave a pendência na transação e processe depois.
- Datas: guarde UTC; converta com `src/utils/datetime.ts` (fuso da loja em `StoreSettings.timezone`).
- Textos de interface em português do Brasil.
- Antes de concluir: `npm run lint`, `npm run typecheck` e `npm test` (com `TEST_DATABASE_URL`).
