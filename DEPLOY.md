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
| `PREVIEW_PASSWORD` | senha da **prévia privada**: o site inteiro pede essa senha e não aparece no Google |

3. Clique em **Deploy**. O primeiro deploy **vai falhar** com a mensagem *"DATABASE_URL não configurada"*. Isso é esperado: ainda falta criar o banco no passo 2.

## 2. Criar o banco de dados

1. No projeto da Vercel, abra a aba **Storage** → **Create Database** → **Neon (Serverless Postgres)** e aceite o plano gratuito.
2. Conecte o banco ao projeto, marcando *Production* e *Preview*. Isso cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED` automaticamente.
3. Em **Deployments**, clique nos três pontinhos do último deploy → **Redeploy**.

Durante esse deploy, o sistema cria as tabelas, as regras contra conflito de horário, os usuários, as configurações reais da loja e o catálogo com os 50 ternos e fotos.

## 3. Acessar

Ao abrir o endereço, o navegador pede **usuário e senha** (modo prévia). Use qualquer usuário (ex.: `sady`) e a senha de `PREVIEW_PASSWORD`. O navegador lembra a senha depois da primeira vez.

- **Site:** o endereço que a Vercel mostrar (ex.: `https://sadyroupas.vercel.app`).
- **Painel:** `/admin`, entrando com **admin@sadyroupas.com.br** (ou **atendimento@sadyroupas.com.br**) e a senha de `SEED_ADMIN_PASSWORD`.

> Os dados iniciais também incluem **clientes, peças físicas e agendamentos de teste**, para você explorar o painel. Antes de usar de verdade, eles precisam ser apagados.

## 4. Fazer mudanças depois de publicado

Cada alteração enviada para a branch `main` do GitHub vira uma nova versão no ar **automaticamente** (1 a 2 minutos). Você só pede as mudanças. Os dados do banco (clientes, agendamentos, peças) **não são apagados** a cada atualização; mudanças no banco são aplicadas pelas migrations no build.

Para testar uma mudança antes de ela ir para o endereço principal, ela pode ser enviada para outra branch: a Vercel cria um **link de pré-visualização** separado, protegido pelo login da Vercel. Esse link usa o **mesmo banco**; para um banco separado de testes, crie outro banco na Neon e conecte só ao ambiente *Preview*.

## 5. Lançar oficialmente (quando quiser)

1. Em **Settings → Environment Variables**, remova `PREVIEW_PASSWORD` e faça um **Redeploy**. O site fica aberto ao público.
2. Domínio próprio (opcional): registre `sadyroupas.com.br` no [registro.br](https://registro.br) (cerca de R$ 40 por ano) e adicione em **Settings → Domains**. A Vercel mostra o que configurar no registro.br. Sem domínio, o endereço gratuito `…vercel.app` continua funcionando.
3. Apague os dados de teste antes de começar a usar com clientes reais.

## Custos

| Item | Custo |
|---|---|
| Vercel (plano Hobby) | gratuito |
| Banco Neon (plano Free) | gratuito (0,5 GB, suficiente para começar) |
| Domínio `.com.br` | opcional, cerca de R$ 40 por ano no registro.br |
| WhatsApp Business Platform | só quando ativar o envio real: a Meta cobra por conversa iniciada pela empresa |

> O plano Hobby da Vercel é para uso não comercial. Quando o sistema estiver atendendo a loja de verdade, a Vercel recomenda o plano Pro (cerca de US$ 20 por mês). Para testar e apresentar, o Hobby atende.

## 6. Depois do primeiro acesso

- Em **Settings → Environment Variables**, remova `SEED_ON_DEPLOY`.
- Quando for usar de verdade, configure também:
  - `APP_URL`: endereço final do site (usado no QR Code das peças e nos links do WhatsApp);
  - `CRON_SECRET`: lembretes automáticos de WhatsApp;
  - `PRINT_AGENT_TOKEN`: impressora da loja (veja `print-agent/README.md`);
  - `SUPABASE_URL` e `STORAGE_KEY`: envio de fotos novas pelo painel;
  - as credenciais do WhatsApp (veja o README).

Enquanto o WhatsApp não for configurado, as mensagens ficam em **modo simulado**: aparecem em **Painel → Notificações**, sem envio real.
