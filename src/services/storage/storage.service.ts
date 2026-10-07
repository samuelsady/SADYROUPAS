import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { badRequest } from "@/lib/errors";

/**
 * Armazenamento de imagens.
 * - Produção: Supabase Storage (SUPABASE_URL + STORAGE_KEY com service role).
 * - Desenvolvimento: pasta public/uploads (não funciona em ambiente serverless).
 */

const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const MAX_BYTES = 5 * 1024 * 1024;

export type StoredFile = { url: string; key: string };

/** Confere os bytes iniciais: o tipo declarado pelo navegador não é confiável. */
function sniff(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (buf.subarray(4, 12).toString("ascii").startsWith("ftypavi")) return "image/avif";
  return null;
}

export const StorageService = {
  get provider() {
    return env.storage.supabaseUrl && env.storage.serviceKey ? "supabase" : "local";
  },

  async uploadImage(file: File, folder: string): Promise<StoredFile> {
    if (file.size === 0) throw badRequest("Arquivo vazio.");
    if (file.size > MAX_BYTES) throw badRequest("Imagem maior que 5 MB.");
    const buf = Buffer.from(await file.arrayBuffer());
    const type = sniff(buf);
    if (!type || !ALLOWED[type]) throw badRequest("Formato não suportado. Use JPG, PNG, WEBP ou AVIF.");
    const key = `${folder.replace(/[^a-z0-9/-]/gi, "")}/${randomUUID()}.${ALLOWED[type]}`;

    if (this.provider === "supabase") {
      const base = env.storage.supabaseUrl!.replace(/\/$/, "");
      const res = await fetch(`${base}/storage/v1/object/${env.storage.bucket}/${key}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.storage.serviceKey}`, "Content-Type": type, "x-upsert": "false" },
        body: buf,
      });
      if (!res.ok) throw new Error(`Falha no upload (${res.status}): ${await res.text()}`);
      return { key, url: `${base}/storage/v1/object/public/${env.storage.bucket}/${key}` };
    }

    if (process.env.VERCEL) throw badRequest("Configure o Supabase Storage (SUPABASE_URL e STORAGE_KEY) para enviar imagens em produção.");
    const dir = path.join(process.cwd(), "public", "uploads", path.dirname(key));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(process.cwd(), "public", "uploads", key), buf);
    return { key, url: `/uploads/${key}` };
  },

  async remove(key: string | null | undefined) {
    if (!key) return;
    try {
      if (this.provider === "supabase") {
        const base = env.storage.supabaseUrl!.replace(/\/$/, "");
        await fetch(`${base}/storage/v1/object/${env.storage.bucket}/${key}`, { method: "DELETE", headers: { Authorization: `Bearer ${env.storage.serviceKey}` } });
      } else {
        await unlink(path.join(process.cwd(), "public", "uploads", key));
      }
    } catch (err) {
      console.warn("[storage] não foi possível remover", key, err);
    }
  },
};
