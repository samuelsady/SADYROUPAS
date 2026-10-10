"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Keyboard, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

type Detector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

/** Extrai o código da peça do conteúdo do QR (URL da ficha ou o próprio código). */
export function parseScannedCode(raw: string) {
  const text = raw.trim();
  const fromUrl = text.match(/\/admin\/estoque\/([^/?#]+)/);
  const code = decodeURIComponent(fromUrl ? fromUrl[1]! : text).toUpperCase();
  return /^[A-Z0-9][A-Z0-9-]{2,39}$/.test(code) ? code : null;
}

/**
 * Leitor de QR Code pela câmera do celular (BarcodeDetector, nativo no Chrome/Android).
 * Sem suporte, a equipe digita ou usa um leitor USB (que "digita" o código no campo).
 */
export function QrScanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [state, setState] = useState<"idle" | "scanning" | "unsupported" | "denied">("idle");
  const [manual, setManual] = useState("");

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => stop, []);

  const go = (code: string) => {
    stop();
    if (navigator.vibrate) navigator.vibrate(60);
    router.push(`/admin/estoque/${encodeURIComponent(code)}?balcao=1`);
  };

  async function start() {
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setState("unsupported");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    } catch {
      setState("denied");
      return;
    }
    setState("scanning");
    const v = video.current!;
    v.srcObject = stream.current;
    await v.play();
    const detector = new window.BarcodeDetector({ formats: ["qr_code", "code_128"] });
    const tick = async () => {
      if (!stream.current) return;
      try {
        const found = await detector.detect(v);
        const code = found.map((f) => parseScannedCode(f.rawValue)).find(Boolean);
        if (code) return go(code);
      } catch {
        /* quadro ainda não pronto */
      }
      window.setTimeout(tick, 250);
    };
    tick();
  }

  return (
    <div className="space-y-5">
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-ink">
        <video ref={video} playsInline muted className={state === "scanning" ? "h-full w-full object-cover" : "hidden"} />
        {state === "scanning" ? (
          <>
            <div className="pointer-events-none absolute inset-10 rounded-xl border-2 border-gold-light/80" />
            <div className="pointer-events-none absolute inset-x-10 top-1/2 h-0.5 animate-pulse bg-gold-light shadow-[0_0_12px_var(--color-gold-light)]" />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-ivory/70">
            {state === "denied" ? <CameraOff className="h-10 w-10 text-red-300" /> : <ScanLine className="h-12 w-12 text-gold-light" strokeWidth={1.25} />}
            <p className="text-sm">
              {state === "denied"
                ? "Sem permissão para usar a câmera. Libere o acesso nas configurações do navegador."
                : state === "unsupported"
                  ? "Este navegador não lê QR Code pela câmera. Use o Chrome no Android, um leitor USB ou digite o código abaixo."
                  : "Aponte a câmera para a etiqueta da peça."}
            </p>
          </div>
        )}
      </div>
      <div className="mx-auto flex max-w-sm justify-center">
        {state === "scanning" ? (
          <Button variant="outline" onClick={() => { stop(); setState("idle"); }}><CameraOff className="h-4 w-4" /> Parar câmera</Button>
        ) : (
          <Button size="lg" onClick={start}><Camera className="h-4 w-4" /> Abrir câmera</Button>
        )}
      </div>
      <form
        className="mx-auto flex max-w-sm gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const code = parseScannedCode(manual);
          if (code) go(code);
        }}
      >
        <div className="relative flex-1">
          <Keyboard className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="TER-PRE-042-001" aria-label="Código da peça" className="pl-9 font-mono uppercase" autoCapitalize="characters" />
        </div>
        <Button type="submit" disabled={!parseScannedCode(manual)}>Abrir</Button>
      </form>
    </div>
  );
}
