#!/usr/bin/env node
/**
 * SERVIÇO LOCAL DE IMPRESSÃO — Sady Roupas
 *
 * Roda no computador da loja (onde a impressora está conectada).
 * Busca comprovantes pendentes no sistema por HTTPS, imprime e informa o resultado.
 * O navegador do cliente nunca acessa a impressora.
 *
 * Requisitos: Node.js 20+. Sem dependências externas.
 * Configuração: print-agent/.env (veja .env.example) ou variáveis de ambiente.
 *
 *   SADY_URL=https://seu-sistema.vercel.app
 *   PRINT_AGENT_TOKEN=<mesmo valor configurado no servidor>
 *   PRINTER_NAME=<nome da impressora no sistema operacional>
 *   PRINT_MODE=auto | windows | lp | file | console
 */
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hostname, platform, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// --- .env simples (sem dependência) ---------------------------------------
const envFile = path.join(here, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const BASE = (process.env.SADY_URL ?? "http://localhost:3000").replace(/\/$/, "");
const TOKEN = process.env.PRINT_AGENT_TOKEN ?? "";
const PRINTER = process.env.PRINTER_NAME ?? "";
const AGENT_ID = process.env.AGENT_ID ?? `loja-${hostname()}`.slice(0, 64);
const POLL_MS = Number(process.env.POLL_INTERVAL_MS ?? 4000);
const HEARTBEAT_MS = 20000;
const MODE = (process.env.PRINT_MODE ?? "auto") === "auto" ? (platform() === "win32" ? "windows" : "lp") : process.env.PRINT_MODE;

if (!TOKEN) {
  console.error("Defina PRINT_AGENT_TOKEN (o mesmo configurado no servidor).");
  process.exit(1);
}

const log = (...a) => console.log(new Date().toLocaleString("pt-BR"), ...a);

async function api(pathname, body) {
  const res = await fetch(`${BASE}${pathname}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 30000, windowsHide: true }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || err.message).toString().trim().slice(0, 300)));
      else resolve(stdout);
    });
  });
}

/** Envia o texto para a impressora conforme o sistema operacional. */
async function printText(content, jobId) {
  // Avanço de papel + corte (ESC/POS) no fim do ticket
  const text = `${content}\n\n\n\n`;
  if (MODE === "console") {
    console.log(`\n${text}`);
    return;
  }
  const dir = path.join(tmpdir(), "sady-print");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${jobId}.txt`);
  writeFileSync(file, text, "utf8");

  if (MODE === "file") {
    const out = process.env.PRINT_OUTPUT_DIR ?? path.join(here, "out");
    mkdirSync(out, { recursive: true });
    writeFileSync(path.join(out, `${jobId}.txt`), text, "utf8");
    return;
  }
  if (MODE === "windows") {
    // Usa o driver da impressora instalada no Windows (térmicas USB aparecem como impressora comum)
    const target = PRINTER ? `-Name '${PRINTER.replace(/'/g, "''")}'` : "";
    await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", `Get-Content -LiteralPath '${file.replace(/'/g, "''")}' -Encoding UTF8 | Out-Printer ${target}`]);
    return;
  }
  // Linux/macOS (CUPS)
  await run("lp", [...(PRINTER ? ["-d", PRINTER] : []), "-o", "raw", file]);
}

/** Verifica se a impressora está disponível (melhor esforço). */
async function printerReady() {
  try {
    if (MODE === "console" || MODE === "file") return { state: "READY", message: `Modo ${MODE}` };
    if (MODE === "windows") {
      const out = await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", PRINTER ? `(Get-Printer -Name '${PRINTER.replace(/'/g, "''")}').PrinterStatus` : "(Get-CimInstance Win32_Printer | Where-Object Default).Name"]);
      const s = out.toString().trim();
      if (!s) return { state: "WAITING", message: "Impressora não encontrada." };
      return /error|offline|paperout|jam/i.test(s) ? { state: "ERROR", message: `Status: ${s}` } : { state: "READY", message: null };
    }
    const out = await run("lpstat", PRINTER ? ["-p", PRINTER] : ["-d"]);
    return /disabled|desativad/i.test(out.toString()) ? { state: "ERROR", message: out.toString().trim() } : { state: "READY", message: null };
  } catch (e) {
    return { state: "WAITING", message: e.message };
  }
}

let busy = false;
async function tick() {
  if (busy) return;
  busy = true;
  try {
    for (;;) {
      const job = await api("/api/print-agent/jobs/claim", { agentId: AGENT_ID });
      if (!job) break;
      try {
        await printText(job.content, job.id);
        await api(`/api/print-agent/jobs/${job.id}/complete`, { agentId: AGENT_ID, ok: true });
        log(`Impresso: ${job.id}`);
      } catch (e) {
        await api(`/api/print-agent/jobs/${job.id}/complete`, { agentId: AGENT_ID, ok: false, error: e.message }).catch(() => {});
        log(`Falha ao imprimir ${job.id}: ${e.message}`);
        break; // espera o próximo ciclo antes de tentar de novo
      }
    }
  } catch (e) {
    log(`Sem conexão com o sistema: ${e.message}`);
  } finally {
    busy = false;
  }
}

async function heartbeat() {
  const status = await printerReady();
  await api("/api/print-agent/heartbeat", { agentId: AGENT_ID, ...status, printerName: PRINTER || null, hostname: hostname() }).catch((e) => log(`Heartbeat falhou: ${e.message}`));
}

log(`Serviço de impressão iniciado — agente ${AGENT_ID}, modo ${MODE}, sistema ${BASE}`);
await heartbeat();
await tick();
setInterval(heartbeat, HEARTBEAT_MS);
setInterval(tick, POLL_MS);
