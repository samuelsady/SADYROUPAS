# Serviço local de impressão

```
BACKEND (fila PrintJob) ──HTTPS──▶ ESTE SERVIÇO (computador da loja) ──▶ IMPRESSORA
```

O agente consulta o sistema a cada poucos segundos, imprime os comprovantes pendentes e informa o resultado. Se a impressora estiver desligada, o trabalho volta para a fila (até 3 tentativas) e depois fica como **Falhou** no painel, com botão para tentar de novo. **O agendamento nunca é afetado.**

## Instalação (Windows)

1. Instale o [Node.js 20+](https://nodejs.org).
2. Instale a impressora térmica normalmente no Windows (driver do fabricante) e anote o nome dela em *Configurações → Impressoras*.
3. Copie a pasta `print-agent` para o computador da loja.
4. Copie `.env.example` para `.env` e preencha `SADY_URL`, `PRINT_AGENT_TOKEN` e `PRINTER_NAME`.
5. Teste: `node agent.mjs` — no painel, **Impressões** deve mostrar a impressora como **CONECTADA**.
6. Para iniciar junto com o Windows, crie uma tarefa no *Agendador de Tarefas* executando `node C:\caminho\print-agent\agent.mjs` "Ao fazer logon".

## Modos (`PRINT_MODE`)

| Modo | Uso |
|---|---|
| `windows` | `Out-Printer` do PowerShell, usando o driver da impressora |
| `lp` | Linux/macOS com CUPS |
| `file` | Salva cada comprovante em `out/` (testes) |
| `console` | Mostra o comprovante no terminal (testes) |

## Status exibidos no painel

- **CONECTADA**: agente ativo e impressora pronta.
- **AGUARDANDO**: agente ativo, impressora não encontrada/indisponível.
- **ERRO**: impressora reportou erro (sem papel, offline…).
- **DESCONECTADA**: nenhum sinal do agente nos últimos 90 segundos.
