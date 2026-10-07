# Sady Roupas — Sistema de gestão

Site, catálogo, agendamento, clientes, agenda, estoque, WhatsApp e impressão da **Sady Roupas** (aluguel de ternos, becas, roupas sociais e acessórios — Teresina/PI, desde 30/10/2008).

Esta é a **V1**. A base já traz o modelo de dados e as regras da **V2** (locações, retiradas, devoluções, lavanderia, manutenção, financeiro), para evoluir sem reescrever o sistema.

```
CLIENTE → SITE → CATÁLOGO → AGENDAMENTO → BACKEND → BANCO → AGENDA → WHATSAPP → IMPRESSÃO
```

O **banco de dados é a fonte única da verdade**. WhatsApp, impressora, agenda e catálogo apenas leem e reagem ao que está gravado. Uma falha de WhatsApp ou de impressão **nunca** invalida um agendamento. Se o banco falhar, nada é confirmado ao usuário.

---

## Tecnologia

| Camada | Escolha |
|---|---|
| Frontend + backend | Next.js 16 (App Router, Server Components, Server Actions, Route Handlers), React 19, TypeScript |
| Estilo | Tailwind CSS 4 (tokens da marca em `src/app/globals.css`) |
| Banco | PostgreSQL + Prisma ORM (migrations versionadas) |
| Autenticação | Sessão própria: JWT HS256 (`jose`) em cookie `httpOnly`, senhas com bcrypt, revalidação no banco a cada requisição |
| Imagens | Supabase Storage (produção) / `public/uploads` (desenvolvimento) |
| WhatsApp | WhatsApp Business Platform — Cloud API oficial (modo SIMULADO até configurar) |
| Impressão | Fila no banco + serviço local (`print-agent/`) no computador da loja |
| Deploy | Vercel + PostgreSQL (Supabase) |

**Por que não Auth.js/Clerk?** O painel só tem login por e-mail e senha da equipe. Uma sessão própria, pequena e testada evita dependência externa e configuração extra. Ela também deixa no nosso controle o bloqueio por tentativas, a revalidação do usuário no banco e a auditoria. Se no futuro for preciso login social ou SSO, `src/lib/auth/` é o único ponto a trocar.

---

## Estrutura

```
src/
  app/
    (site)/            Site público: /, /catalogo, /catalogo/[slug], /agendamento, /contato
    admin/login        Login da equipe
    admin/(panel)/     Painel: dashboard, agenda, agendamentos, clientes, catálogo, estoque,
                       impressões, notificações, configurações, auditoria, busca, módulos V2
    admin/(panel)/_actions/  Server Actions do painel (sempre verificam permissão)
    api/public/        Disponibilidade, agendamento público, .ics
    api/admin/         Horários do painel, busca de clientes, PDF do comprovante
    api/print-agent/   API do serviço local de impressão (token)
    api/cron/          Lembretes e reenvio de WhatsApp (token)
  services/            REGRAS DE NEGÓCIO (AppointmentService, CustomerService, InventoryService,
                       NotificationService, PrintService, AuditService, RentalRules…)
  database/            Prisma client e tratamento de erros do banco
  lib/                 Auth, validação (zod), rate limit, env, rótulos, helpers de API/actions
  components/          ui/ (design system), site/, admin/
  hooks/               Hooks de cliente (horários disponíveis, formulários)
  utils/               Datas no fuso da loja, telefone, códigos, .ics, texto
  types/               Contratos compartilhados (API pública, agente de impressão)
  proxy.ts             Barreira de acesso ao /admin (Next 16: antigo "middleware")
prisma/                schema, migrations (com restrições de exclusão), seed
print-agent/           Serviço local de impressão (Node, sem dependências)
tests/                 Testes unitários e de integração (PostgreSQL real)
```

Páginas, Server Actions, APIs e, no futuro, a IA da V3 **só** acessam dados através de `src/services`. Nenhuma interface fala direto com a impressora ou com o WhatsApp.

---

## Rodando localmente

> **Windows, passo a passo detalhado (sem publicar nada): veja [LOCAL.md](LOCAL.md).**

Requisitos: Node 20+ e PostgreSQL 14+.

```bash
npm install
cp .env.example .env          # ajuste DATABASE_URL e gere AUTH_SECRET (openssl rand -base64 48)
npm run setup                 # cria as tabelas e os dados de demonstração
npm run dev                   # http://localhost:3000
```

Painel: http://localhost:3000/admin. O seed cria `admin@sadyroupas.com.br` (Administrador) e `atendimento@sadyroupas.com.br` (Atendente). A senha é a de `SEED_ADMIN_PASSWORD`; sem essa variável, a senha padrão de desenvolvimento é `sady2008`. **Troque em produção.**

O seed usa as **informações reais da loja** (endereço, telefones, horários) e os **50 ternos reais com fotos** do site anterior. Tamanhos, peças físicas, clientes e agendamentos são **dados de teste**.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run dev:rede` | Igual, acessível pelo celular na mesma rede Wi-Fi |
| `npm run setup` | Primeira instalação: migrations + dados de demonstração |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` / `npm run typecheck` | Qualidade |
| `npm test` | Testes (exige um banco de teste, veja abaixo) |
| `npm run db:migrate` | Nova migration em desenvolvimento |
| `npm run db:deploy` | Aplica migrations em produção |
| `npm run db:seed` | Dados de desenvolvimento (bloqueado em produção) |
| `npm run print-agent` | Inicia o serviço local de impressão |

### Testes

```bash
createdb sady_test   # banco exclusivo para testes (o nome precisa conter "test")
TEST_DATABASE_URL="postgresql://USUARIO:SENHA@localhost:5432/sady_test" npm test
```

Os testes cobrem a geração de horários, datas no fuso de Teresina, telefone, comprovante térmico (32/48 colunas), multa por atraso e status de pagamento (V2). Os de integração usam PostgreSQL real e cobrem:

- **seis pessoas pedindo o mesmo horário ao mesmo tempo: só uma consegue;**
- o banco recusa a sobreposição mesmo se a validação da aplicação for burlada;
- cancelar libera o horário; remarcar revalida a disponibilidade;
- o site não sobrescreve o cadastro de um cliente existente;
- WhatsApp no modo SIMULADO, e falha em PRODUÇÃO sem credenciais sem afetar o agendamento;
- fila de impressão: dois agentes nunca pegam o mesmo trabalho; 3 falhas resultam em FALHOU mais um alerta; reimpressão funciona;
- V2: a mesma peça não pode estar em duas locações com datas sobrepostas.

---

## Regras críticas

### Nunca dois agendamentos conflitantes: validação em 3 camadas

1. **Frontend**: só mostra horários livres, consultados no servidor.
2. **Backend** (`AppointmentService`): recalcula a grade e a disponibilidade antes de gravar.
3. **Banco**: restrição `EXCLUDE USING gist` em `Appointment` (`prisma/migrations/*/migration.sql`). Com requisições simultâneas, apenas uma transação grava; a outra recebe a mensagem *"Este horário acabou de ser reservado"* e a tela recarrega os horários.

A capacidade de atendimentos simultâneos é configurável (*lanes*): com 2 atendentes, dois clientes podem ser atendidos no mesmo horário.

### Horários gerados automaticamente

Em **Configurações → Horários** a equipe define, para cada dia da semana: se a loja abre, horário de abertura e fechamento e pausa (almoço). Ali também ficam a duração padrão, o intervalo entre atendimentos, os atendimentos simultâneos, a antecedência mínima e quantos dias à frente o site aceita. Em **Bloqueios** entram feriados e períodos fechados. Cada serviço pode ter duração própria.

Exemplo: das 08:00 às 18:00, com duração de 30 min e intervalo de 10 min, os horários ficam 08:00, 08:40, 09:20… até 17:20.

### Produto x peça física

Um **produto** (ex.: *Terno Slim Preto*) tem várias **peças físicas**, cada uma com código próprio (`TER-PRE-042-001`), tamanho, cor, status, localização, contador de locações, histórico de movimentações e QR Code.

### Auditoria

`AuditLog` registra quem, o quê, quando e qual registro em toda operação relevante: login, agendamento criado, alterado, cancelado ou concluído, impressão e reimpressão, produto, peça, configurações e usuários. A gravação acontece na mesma transação da operação.

---

## Lista de provas → estoque

1. No catálogo, o cliente escolhe o tamanho e toca em **"Quero provar"**. A lista fica no navegador (ícone de cabide no topo) e vai junto com o agendamento.
2. O servidor revalida produtos e tamanhos e grava a lista em `AppointmentItem`. O comprovante impresso lista as peças.
3. No painel, o dashboard mostra **"Peças para separar"** (hoje e amanhã) e a agenda mostra quantas peças de cada atendimento já foram separadas.
4. Na ficha do agendamento, a equipe escolhe a peça física e toca em **Separar**. A peça fica **RESERVADA**, com o nome do cliente no histórico. A reserva é condicional ao status DISPONÍVEL, então duas pessoas nunca separam a mesma peça.
5. Se o atendimento for **cancelado** ou o cliente **não comparecer**, as peças separadas voltam sozinhas para **DISPONÍVEL**.

## Autoatendimento do cliente

O link da confirmação, que também vai na mensagem de WhatsApp pela variável `{link}`, abre a página **"Meu agendamento"**, onde o cliente pode **remarcar** (mesmas regras de horário do site) ou **cancelar**. Isso vale até X horas antes do horário, configurável em **Configurações → Horários** (padrão: 3h). A equipe recebe um alerta no sino, e o cliente recebe a mensagem de alteração ou cancelamento.

## Estoque no dia a dia

- **Status direto na lista**: troque o status no próprio selo da linha.
- **Ações em lote**: marque várias peças e altere status e/ou localização de uma vez. Cada peça recebe sua linha no histórico.
- **Leitor de QR Code** (`/admin/estoque/leitor`): pela câmera do celular (Chrome/Android), por um leitor USB ou digitando o código. Abre a peça em **modo balcão**, com botões grandes para mudar o status em um toque.
- **Grade tamanho × status** em cada produto e alerta de **tamanhos esgotados** no dashboard.

## WhatsApp

```
Sistema → Evento → NotificationService → WhatsApp API → Cliente
```

- Eventos da V1: `APPOINTMENT_CREATED`, `APPOINTMENT_UPDATED`, `APPOINTMENT_CANCELLED` e `APPOINTMENT_REMINDER`. Os eventos da V2 já estão cadastrados (`RETURN_OVERDUE`, `PICKUP_REMINDER`…).
- **Outbox**: a mensagem é gravada como pendente na mesma transação do agendamento e enviada depois da resposta, com até 3 tentativas. Falhas aparecem no painel com botão **Reenviar**.
- **Modo SIMULADO** (padrão): nada é enviado; a mensagem fica registrada com status *Simulado*.
- **Modo PRODUÇÃO**: preencha `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` e mude o modo em **Configurações → WhatsApp**. Mensagens iniciadas pela empresa exigem **templates aprovados pela Meta**: informe, em cada mensagem, o nome do template e a ordem das variáveis.
- **Lembretes**: `/api/cron/notifications` enfileira lembretes para atendimentos dentro da janela configurada (padrão 24h) e reenvia mensagens pendentes.
- Sem IA e sem chatbot (previsto para a V3).

## Impressão

```
BACKEND → FILA (PrintJob) → SERVIÇO LOCAL (computador da loja) → IMPRESSORA
```

- Cada agendamento cria um `PrintJob` com o comprovante térmico pronto: 80mm com 48 colunas ou 58mm com 32 colunas, sem acentos para funcionar em qualquer ESC/POS. Isso pode ser desligado nas configurações.
- O agente local (`print-agent/`, instruções no `print-agent/README.md`) busca a fila por HTTPS. Assim ele funciona atrás do roteador da loja, sem abrir portas.
- Estados do trabalho: `PRINT_PENDING`, `PRINTING`, `PRINTED`, `PRINT_FAILED` e `CANCELLED`.
- Estados da impressora: **CONECTADA**, **AGUARDANDO**, **DESCONECTADA** (sem sinal há 90s) e **ERRO**.
- No painel, em **Impressões**, a equipe pode reimprimir, cancelar, ver o erro e acompanhar o status. Cada agendamento também tem o comprovante em **PDF**.

---

## Segurança

- Rotas `/admin` e `/api/admin` protegidas pelo `proxy.ts`. **Toda** página, Server Action e API revalida a sessão e a permissão (`ADMIN` ou `STAFF`), e o usuário desativado perde o acesso na hora.
- Senhas com bcrypt (custo 12); bloqueio de 15 min após 5 tentativas; resposta igual para e-mail inexistente e senha errada.
- Rate limit persistido no PostgreSQL (funciona em serverless): login, agendamento público por IP e por WhatsApp.
- Agendamento público: verificação de origem (CSRF), honeypot anti-robô, validação zod no servidor e link de confirmação com token aleatório (o código sequencial não expõe dados).
- Prisma (consultas parametrizadas) contra SQL injection. React escapa todo conteúdo contra XSS; o único HTML injetado é o SVG do QR Code gerado no servidor.
- Uploads validados pelos bytes do arquivo (não pela extensão), com limite de 5 MB.
- Segredos só no servidor (nenhuma variável `NEXT_PUBLIC_`). Cabeçalhos de segurança (HSTS, X-Frame-Options, nosniff…). Erros internos vão para o log, e o usuário recebe uma mensagem genérica.

---

## Deploy (Vercel + Supabase)

> **Passo a passo simplificado (Vercel + Neon, ~10 min): veja [DEPLOY.md](DEPLOY.md).**

1. Crie o projeto no **Supabase**. Copie a connection string do Postgres para `DATABASE_URL`, crie um bucket **público** `produtos` no Storage e copie a URL e a chave `service_role` para `SUPABASE_URL` e `STORAGE_KEY`.
2. Importe o repositório na **Vercel** e configure as variáveis do `.env.example` (`AUTH_SECRET`, `APP_URL`, `PRINT_AGENT_TOKEN`, `CRON_SECRET`…).
3. Aplique as migrations: `DATABASE_URL=… npm run db:deploy`.
4. Para o primeiro acesso, rode `SEED_FORCE=1 SEED_ADMIN_PASSWORD=<senha forte> npm run db:seed` no banco de produção. Isso cria os usuários, as configurações reais da loja e o catálogo inicial com fotos, mas também insere peças, clientes e agendamentos **de teste**, que precisam ser apagados depois.
5. O `vercel.json` agenda o cron uma vez por dia (compatível com o plano gratuito). No plano Pro, troque para `0 * * * *` (de hora em hora).
6. Instale o `print-agent` no computador da loja.

> Na Vercel, cada requisição aceita até ~4,5 MB. Envie fotos de produto em lotes pequenos.

---

## Roteiro

**V1 (este repositório)**: site, catálogo com filtros, agendamento sem login, agenda (dia, semana e mês), agendamento manual, clientes com medidas, catálogo e fotos, estoque por peça física com histórico e QR Code, WhatsApp por eventos, fila de impressão com agente local e PDF, notificações internas, configurações, usuários e auditoria.

**V2 (estrutura pronta)**: `Rental`, `RentalItem` (com bloqueio de sobreposição no banco), `Pickup`, `Return`, `ReturnItem`, `Laundry`, `Maintenance`, `Payment`, `LateFee`, `Kit`, `CustomerMeasurement`; status de peça CONFERÊNCIA, LAVANDERIA, MANUTENÇÃO e PERDIDO; política de locação e multa por atraso configurável; regras testadas em `src/services/rental.service.ts`; menus já reservados no painel.

**V3**: IA no WhatsApp. Ela será apenas mais um cliente da camada de serviços: consulta a disponibilidade e cria agendamentos pelo backend autorizado, **nunca** sendo a fonte da verdade.
