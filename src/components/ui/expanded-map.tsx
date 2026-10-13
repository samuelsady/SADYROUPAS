"use client";

/**
 * LocationMap — cartão de localização que se inclina com o mouse e, ao clicar,
 * expande mostrando o mapa real (blocos do OpenStreetMap/CARTO) com o marcador.
 * Base: componente "expanded-map" (shadcn/ui + motion). Adaptado para a Sady:
 * - usa framer-motion (mesma API do pacote "motion", já instalado no projeto);
 * - cores da marca (dourado) em vez de verde;
 * - o ponto exato fica no centro do mapa (o original centralizava só o bloco);
 * - largura expandida se ajusta ao espaço disponível (celular);
 * - `children` permite colocar ações (ex.: "Como chegar") sem fechar o cartão.
 */
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import NextImage from "next/image";
import type React from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface LocationMapProps {
  /** Nome do local exibido no cartão */
  location?: string;
  /** Linha secundária (ex.: endereço) */
  subtitle?: string;
  latitude?: number;
  longitude?: number;
  /** Zoom do mapa (1-18) */
  zoom?: number;
  className?: string;
  tileProvider?: "openstreetmap" | "carto-light" | "carto-dark";
  defaultExpanded?: boolean;
  /** Ações exibidas no rodapé do cartão (cliques nelas não abrem/fecham o mapa) */
  children?: React.ReactNode;
}

const TILE = 256;
const SIZE = { collapsed: { w: 300, h: 190 }, expanded: { w: 420, h: 340 } };

function tilePoint(lat: number, lng: number, zoom: number) {
  const n = 2 ** zoom;
  const latRad = (lat * Math.PI) / 180;
  return { x: ((lng + 180) / 360) * n, y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n };
}

function getTileUrl(provider: string, x: number, y: number, z: number) {
  switch (provider) {
    case "carto-light":
      return `https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/${z}/${x}/${y}.png`;
    case "carto-dark":
      return `https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/${z}/${x}/${y}.png`;
    default:
      return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  }
}

function formatCoordinates(lat: number, lng: number) {
  return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? "L" : "O"}`;
}

export function LocationMap({
  location = "San Francisco, CA",
  subtitle,
  latitude = 37.7749,
  longitude = -122.4194,
  zoom = 15,
  className,
  tileProvider = "carto-light",
  defaultExpanded = false,
  children,
}: LocationMapProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [maxWidth, setMaxWidth] = useState(SIZE.expanded.w);
  const containerRef = useRef<HTMLDivElement>(null);
  const gridId = useId();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springRotateX = useSpring(useTransform(mouseY, [-50, 50], [8, -8]), { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(useTransform(mouseX, [-50, 50], [-8, 8]), { stiffness: 300, damping: 30 });

  const coordinates = useMemo(() => formatCoordinates(latitude, longitude), [latitude, longitude]);

  // Grade 3×3 de blocos, deslocada para que o ponto exato fique no centro
  const { tiles, shift } = useMemo(() => {
    const p = tilePoint(latitude, longitude, zoom);
    const cx = Math.floor(p.x);
    const cy = Math.floor(p.y);
    const list: { url: string; offsetX: number; offsetY: number }[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) list.push({ url: getTileUrl(tileProvider, cx + dx, cy + dy, zoom), offsetX: dx, offsetY: dy });
    return { tiles: list, shift: { x: (0.5 - (p.x - cx)) * TILE, y: (0.5 - (p.y - cy)) * TILE } };
  }, [latitude, longitude, zoom, tileProvider]);

  // Largura disponível (no celular o cartão expandido não passa da tela)
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(([e]) => setMaxWidth(Math.min(SIZE.expanded.w, Math.floor(e!.contentRect.width))));
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  // Pré-carrega os blocos só quando o mapa é aberto
  useEffect(() => {
    if (!isExpanded || tilesLoaded) return;
    let loaded = 0;
    const done = () => {
      loaded++;
      if (loaded === tiles.length) setTilesLoaded(true);
    };
    tiles.forEach((tile) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = done;
      img.onerror = done;
      img.src = tile.url;
    });
  }, [isExpanded, tiles, tilesLoaded]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - (rect.left + rect.width / 2));
    mouseY.set(e.clientY - (rect.top + rect.height / 2));
  };
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };
  const toggle = () => setIsExpanded((v) => !v);

  return (
    <motion.div
      ref={containerRef}
      className={cn("relative cursor-pointer select-none", className)}
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={`${location}: ${isExpanded ? "fechar" : "abrir"} mapa`}
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-[0_20px_50px_-30px_rgb(14_12_10/0.45)]"
        style={{ rotateX: springRotateX, rotateY: springRotateY, transformStyle: "preserve-3d" }}
        initial={false}
        animate={{
          width: isExpanded ? maxWidth : Math.min(SIZE.collapsed.w, maxWidth),
          height: isExpanded ? SIZE.expanded.h : SIZE.collapsed.h,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
      >
        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-br from-gold-light/10 via-transparent to-muted/40" />

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="pointer-events-none absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className="absolute"
                  style={{
                    width: TILE * 3,
                    height: TILE * 3,
                    left: "50%",
                    top: "50%",
                    transform: `translate(calc(-50% + ${shift.x}px), calc(-50% + ${shift.y}px))`,
                  }}
                >
                  {tiles.map((tile, index) => (
                    <motion.div
                      key={tile.url}
                      className="absolute"
                      style={{ width: TILE, height: TILE, left: (tile.offsetX + 1) * TILE, top: (tile.offsetY + 1) * TILE }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: tilesLoaded ? 1 : 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <NextImage src={tile.url} alt="" width={TILE} height={TILE} unoptimized crossOrigin="anonymous" className="h-full w-full" />
                    </motion.div>
                  ))}
                </div>
              </div>

              {!tilesLoaded && <div className="absolute inset-0 animate-pulse bg-muted" />}

              {/* Marcador */}
              <motion.div
                className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full"
                initial={{ scale: 0, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.3 }}
              >
                <span className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1/2 animate-ping rounded-full bg-gold/50" />
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" style={{ filter: "drop-shadow(0 4px 10px rgba(148, 116, 63, 0.55))" }}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#0e0c0a" />
                  <circle cx="12" cy="9" r="2.7" fill="#c2a06a" />
                </svg>
              </motion.div>

              <div className="absolute inset-0 z-10 bg-gradient-to-t from-card via-card/10 to-transparent" />
              <div className="absolute inset-0 z-10 bg-gradient-to-b from-card/60 via-transparent to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grade de fundo (fechado) */}
        <motion.div className="absolute inset-0" animate={{ opacity: isExpanded ? 0 : 0.06 }} transition={{ duration: 0.3 }}>
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <pattern id={gridId} width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" className="stroke-foreground" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${gridId})`} />
          </svg>
        </motion.div>

        <div className="relative z-20 flex h-full flex-col justify-between p-5">
          <div className="flex items-start justify-between">
            <motion.svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gold-dark"
              animate={{
                opacity: isExpanded ? 0 : 1,
                filter: isHovered ? "drop-shadow(0 0 8px rgba(194, 160, 106, 0.7))" : "drop-shadow(0 0 3px rgba(194, 160, 106, 0.35))",
              }}
              transition={{ duration: 0.3 }}
              aria-hidden
            >
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
              <line x1="9" x2="9" y1="3" y2="18" />
              <line x1="15" x2="15" y1="6" y2="21" />
            </motion.svg>
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">{isExpanded ? "Fechar" : "Ver mapa"}</span>
          </div>

          <div className="space-y-1">
            <motion.h3 className="font-display text-xl leading-tight text-foreground" animate={{ x: isHovered ? 4 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
              {location}
            </motion.h3>
            {subtitle && <p className="text-xs leading-snug text-muted-foreground">{subtitle}</p>}
            <AnimatePresence>
              {isExpanded && (
                <motion.p
                  className="font-mono text-[11px] text-muted-foreground"
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {coordinates}
                </motion.p>
              )}
            </AnimatePresence>
            <motion.div
              className="h-px bg-gradient-to-r from-gold via-gold-light/50 to-transparent"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: isHovered || isExpanded ? 1 : 0.3 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
            {children && (
              <div className="pt-2" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                {children}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default LocationMap;
