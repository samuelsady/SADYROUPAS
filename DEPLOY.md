# Publicar o sistema (Vercel + Neon): passo a passo

Leva cerca de 10 minutos. Os planos gratuitos da Vercel e da Neon atendem bem à demonstração.
Você só precisa da sua conta no GitHub e de uma conta na [Vercel](https://vercel.com/signup), criada entrando com o GitHub.

> A Vercel publica a branch **`main`**. O código precisa estar no `main` do repositório (por pull request) antes do passo 1.

## 1. Importar o projeto

1. Acesse **https://vercel.com/new** e clique em **Import** ao lado de `samuelsady/SADYROUPAS`.
   Se o repositório não aparecer, clique em *Adjust GitHub App Permissions* e libere o acesso a ele.
2. **Não clique em Deploy ainda.** Abra **Environment Variables** e adicione:

| Nome | Valor |
|---|---|
| `AUTH_SECRET` | um texto longo e aleatório (mínimo 32 caracteres). Pode gerar em https://generate-secret.vercel.app/48 |
| `SEED_ON_DEPLOY` | `1` |
| `SEED_ADMIN_PASSWORD` | a senha que você vai usar no painel (mínimo 8 caracteres) |

3. Clique em **Deploy**. O primeiro deploy **vai falhar** com a mensagem *"DATABASE_URL não configurada"*. Isso é esperado: ainda falta criar o banco no passo 2.

## 2. Criar o banco de dados

1. No projeto da Vercel, abra a aba **Storage** → **Create Database** → **Neon (Serverless Postgres)** e aceite o plano gratuito.
2. Conecte o banco ao projeto, marcando *Production* e *Preview*. Isso cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED` automaticamente.
3. Em **Deployments**, clique nos três pontinhos do último deploy → **Redeploy**.

Durante esse deploy, o sistema cria as tabelas, as regras contra conflito de horário, os usuários, as configurações reais da loja e o catálogo com os 50 ternos e fotos.

## 3. Acessar

- **Site:** o endereço que a Vercel mostrar (ex.: `https://sadyroupas.vercel.app`).
- **Painel:** `/admin`, entrando com **admin@sadyroupas.com.br** (ou **atendimento@sadyroupas.com.br**) e a senha de `SEED_ADMIN_PASSWORD`.

> Os dados iniciais também incluem **clientes, peças físicas e agendamentos de teste**, para você explorar o painel. Antes de usar de verdade, eles precisam ser apagados.

## 4. Depois do primeiro acesso

- Em **Settings → Environment Variables**, remova `SEED_ON_DEPLOY`.
- Quando for usar de verdade, configure também:
  - `APP_URL`: endereço final do site (usado no QR Code das peças e nos links do WhatsApp);
  - `CRON_SECRET`: lembretes automáticos de WhatsApp;
  - `PRINT_AGENT_TOKEN`: impressora da loja (veja `print-agent/README.md`);
  - `SUPABASE_URL` e `STORAGE_KEY`: envio de fotos novas pelo painel;
  - as credenciais do WhatsApp (veja o README).

Enquanto o WhatsApp não for configurado, as mensagens ficam em **modo simulado**: aparecem em **Painel → Notificações**, sem envio real.
