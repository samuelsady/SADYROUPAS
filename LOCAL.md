# Rodar o sistema no seu computador (Windows), sem publicar nada

Assim você usa o sistema completo (site, agendamento, painel, estoque) **só no seu computador**, de graça, sem domínio e sem ninguém de fora ter acesso. Dá para testar à vontade e pedir alterações antes de publicar.

Tempo da primeira vez: cerca de 30 minutos. Depois, só o passo 6.

---

## 1. Instalar os programas (uma vez só)

| Programa | Para quê | Onde baixar |
|---|---|---|
| **Node.js 22 LTS** | roda o sistema | https://nodejs.org → botão **LTS** → instalar com tudo padrão ("Next, Next…") |
| **Git** | baixa o código do GitHub | https://git-scm.com/download/win → instalar com tudo padrão |
| **PostgreSQL 16** | o banco de dados | https://www.postgresql.org/download/windows/ → *Download the installer* (EDB) |

Na instalação do **PostgreSQL**:
- Deixe todos os componentes marcados.
- Quando pedir uma **senha** para o usuário `postgres`, crie uma e **anote** (exemplo neste guia: `minhasenha`).
- Porta: deixe **5432**. No final, pode desmarcar o *Stack Builder*.

Depois de instalar, **feche e abra de novo** qualquer janela de terminal.

---

## 2. Criar o banco de dados

1. Abra o menu Iniciar e procure **pgAdmin 4** (instalado junto com o PostgreSQL).
2. À esquerda, clique em **Servers → PostgreSQL 16** e digite a senha que você criou.
3. Clique com o botão direito em **Databases → Create → Database…**
4. Em *Database*, escreva `sady` e clique em **Save**.

---

## 3. Baixar o código

> **Importante:** não use uma pasta dentro do **OneDrive** (como `C:\Users\samue\OneDrive\...`). O OneDrive tenta sincronizar milhares de arquivos de `node_modules`, deixa tudo lento e causa erros. Use, por exemplo, `C:\projetos`.

1. Abra o **PowerShell** (menu Iniciar → "PowerShell").
2. Cole os comandos, um por vez:

```powershell
mkdir C:\projetos
cd C:\projetos
git clone -b claude/kind-heisenberg-yr5zhw https://github.com/samuelsady/SADYROUPAS.git sady-roupas
cd sady-roupas
```

---

## 4. Configurar

1. Ainda no PowerShell, dentro da pasta `sady-roupas`:

```powershell
copy .env.example .env
notepad .env
```

2. No Bloco de Notas, altere **só estas duas linhas** e salve (Ctrl+S):

```
DATABASE_URL="postgresql://postgres:minhasenha@localhost:5432/sady?schema=public"
AUTH_SECRET="escreva-aqui-um-texto-longo-qualquer-com-mais-de-32-letras-123"
```

Troque `minhasenha` pela senha do PostgreSQL do passo 1. Se a senha tiver `@`, `#` ou `/`, use outra senha mais simples para evitar problemas.

---

## 5. Instalar e preparar (uma vez só)

```powershell
npm install
npm run setup
```

- `npm install` baixa as bibliotecas (alguns minutos).
- `npm run setup` cria as tabelas e coloca os dados de demonstração: configurações da loja, os 50 ternos com fotos, peças, clientes e agendamentos de teste.

No final deve aparecer: `Login do painel: admin@sadyroupas.com.br / sady2008`.

---

## 6. Ligar o sistema (sempre que quiser usar)

```powershell
cd C:\projetos\sady-roupas
npm run dev
```

Quando aparecer `Ready`, abra no navegador:

- **Site:** http://localhost:3000
- **Painel:** http://localhost:3000/admin
  - Administrador: `admin@sadyroupas.com.br` / `sady2008`
  - Atendente: `atendimento@sadyroupas.com.br` / `sady2008`

Para desligar, volte ao PowerShell e aperte **Ctrl+C**.

### Abrir no celular (mesma rede Wi-Fi)

1. Ligue com `npm run dev:rede` em vez de `npm run dev`.
2. No PowerShell, rode `ipconfig` e anote o **Endereço IPv4** (ex.: `192.168.0.15`).
3. No celular, conectado ao mesmo Wi-Fi, abra `http://192.168.0.15:3000`.
4. Se o Windows perguntar sobre o **Firewall**, permita em *Redes privadas*.

> No celular, a câmera do leitor de QR Code só funciona em sites com `https` (no computador, em `localhost`, funciona). Pelo IP local, use o campo de digitar o código.

---

## O que funciona e o que fica simulado no seu computador

| Recurso | No seu computador |
|---|---|
| Site, catálogo, lista de provas, agendamento, remarcar/cancelar | ✅ funciona de verdade |
| Painel, agenda, clientes, estoque, QR Code, auditoria | ✅ funciona de verdade |
| WhatsApp | 🟣 **simulado**: as mensagens aparecem em *Painel → Notificações*, nada é enviado |
| Impressão | ✅ dá para testar com o serviço local (`print-agent/README.md`) ou ver o **PDF** do comprovante |
| Enviar fotos novas de produto | ✅ salva na pasta `public/uploads` |

Tudo o que você fizer fica **só no banco do seu computador**.

---

## Atualizar quando houver alterações novas

Quando eu fizer novas alterações (nesta sessão ou em outra), rode:

```powershell
cd C:\projetos\sady-roupas
git pull
npm install
npx prisma migrate deploy
npm run dev
```

## Voltar os dados de demonstração ao início

No pgAdmin, apague o banco `sady` (botão direito → *Delete*), crie de novo (passo 2) e rode `npm run setup`.

---

## Problemas comuns

| Mensagem | O que fazer |
|---|---|
| `'node' não é reconhecido` / `'git' não é reconhecido` | Feche e abra o PowerShell de novo; se continuar, reinstale marcando "Add to PATH". |
| `P1000: Authentication failed` | A senha no `DATABASE_URL` do `.env` está diferente da senha do PostgreSQL. |
| `P1001: Can't reach database server` | O PostgreSQL não está rodando: Iniciar → "Serviços" → `postgresql-x64-16` → Iniciar. |
| `Database "sady" does not exist` | Faltou o passo 2. |
| `Port 3000 is in use` | Já tem um sistema ligado; feche o outro PowerShell ou use `npm run dev -- -p 3001`. |
| Erro de "execution policy" ao rodar `npm` | Rode uma vez: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e confirme com `S`. |

---

## Pedir alterações com o Claude Code no seu computador (opcional)

Com o sistema na pasta, você pode instalar o Claude Code e pedir mudanças direto nela:

```powershell
npm install -g @anthropic-ai/claude-code
cd C:\projetos\sady-roupas
claude
```

Ou continue pedindo por aqui. Eu envio as alterações para o GitHub e você atualiza com `git pull`.
