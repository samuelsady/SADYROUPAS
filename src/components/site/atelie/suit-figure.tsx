/**
 * Desenho do manequim e das peças (camisa, calça, gravata, colete, blazer, lenço),
 * cada uma em sua própria camada para o efeito de profundidade 3D.
 * Coordenadas no espaço 400×620; peças simétricas são desenhadas pela metade
 * esquerda e espelhadas.
 */
import type { PieceId, SuitConfig } from "./suit-config";
import { find, isLight, shade, SHIRT_TONES, SUIT_TONES, TIE_TONES, VEST_TONES } from "./suit-config";

export const VIEWBOX = "0 0 400 620";
const MIRROR = "matrix(-1 0 0 1 400 0)";

/* ---------------------------------------------------------------- caminhos */
const P = {
  neck: "M178,44 C178,70 176,86 170,98 L230,98 C224,86 222,70 222,44 Z",
  torso:
    "M170,98 C150,102 118,106 100,116 C90,122 86,134 88,148 L124,178 C126,240 134,300 134,330 C134,380 120,420 120,460 L122,500 L278,500 L280,460 C280,420 266,380 266,330 C266,300 274,240 276,178 L312,148 C314,134 310,122 300,116 C282,106 250,102 230,98 Z",
  arm: "M100,118 C84,126 80,150 80,172 C78,240 72,300 70,360 C68,400 68,430 70,452 L96,452 C96,420 100,380 104,340 C110,280 118,220 124,180 Z",

  shirtHalf: "M200,96 L172,96 C152,101 120,105 102,115 C92,121 88,134 89,148 L124,178 C126,240 134,300 134,330 C134,380 120,420 120,460 L122,500 L200,500 Z",
  shirtSleeve: "M102,114 C84,124 78,150 78,172 C76,240 70,300 68,360 C66,400 66,426 67,442 L98,442 C98,420 102,380 106,340 C112,280 120,220 126,180 Z",
  cuff: "M66,436 L100,436 L100,457 L66,457 Z",
  collarBand: "M176,80 C186,86 214,86 224,80 L229,99 C214,105 186,105 171,99 Z",
  collarPoint: "M174,94 L157,104 L182,138 L199,112 Z",

  trousersHalf: "M200,326 L134,326 C134,380 120,420 120,460 L122,500 L200,500 Z",

  tieKnot: "M189,110 L211,110 L206,131 L194,131 Z",
  tieBlade: "M194,131 L206,131 L216,298 L200,316 L184,298 Z",
  bowWing: "M196,117 L168,101 C161,111 161,125 168,135 Z",

  vestHalf: "M170,104 C152,108 132,112 120,120 C116,150 121,178 129,196 C133,250 136,300 136,342 L192,374 L200,364 L200,252 Z",
  vestPocket: "M146,300 L176,296 L176,302 L146,306 Z",

  blazerHalf:
    "M172,102 C152,98 116,100 92,111 C80,120 76,140 78,160 L122,182 C126,250 132,300 132,330 C130,380 118,420 114,472 C140,478 172,470 182,440 C192,410 198,380 200,340 L200,334 Z",
  blazerSleeve: "M92,111 C76,122 72,150 72,174 C70,240 64,300 62,360 C60,398 60,424 62,444 L101,444 C101,412 104,380 108,340 C114,280 120,222 124,182 C112,160 100,134 92,111 Z",
  blazerCollar: "M166,108 C176,90 224,90 234,108 L228,102 C216,93 184,93 172,102 Z",
  pocketFlap: "M134,392 L180,388 L181,404 L135,408 Z",
  chestWelt: "M236,206 L271,200 L272,207 L237,213 Z",
  dart: "M156,236 C157,290 158,340 160,384",

  lapel: {
    entalhada: "M172,102 L150,126 L159,134 L139,145 C143,212 172,282 198,332 Z",
    bico: "M172,102 L154,124 L126,118 L141,149 C145,214 172,282 198,332 Z",
    xale: "M172,100 C138,132 138,226 198,332 Z",
  },
  square: "M240,207 L245,186 L252,201 L259,183 L267,200 L268,205 Z",
};

/* ------------------------------------------------------------- utilitários */
function Cloth({ d, color, fabric, half = true, stroke = true }: { d: string; color: string; fabric?: string; half?: boolean; stroke?: boolean }) {
  return (
    <>
      <path d={d} fill={color} stroke={stroke ? shade(color, -0.4) : "none"} strokeWidth={0.8} strokeLinejoin="round" />
      {fabric && fabric !== "liso" && <path d={d} fill={`url(#f-${fabric}${isLight(color) ? "-d" : ""})`} />}
      <path d={d} fill={half ? "url(#sh-h)" : "url(#sh-full)"} />
      <path d={d} fill="url(#sh-v)" />
    </>
  );
}

function Mirrored({ children }: { children: React.ReactNode }) {
  return (
    <>
      <g>{children}</g>
      <g transform={MIRROR}>{children}</g>
    </>
  );
}

/** Definições compartilhadas (gradientes, tramas, sombra). Renderizar uma vez por página. */
export function SuitDefs() {
  const line = (o: number) => `rgb(255 255 255 / ${o})`;
  const dark = (o: number) => `rgb(0 0 0 / ${o})`;
  const fabrics = (light: boolean) => {
    const c = light ? dark : line;
    const s = light ? "-d" : "";
    return (
      <>
        <pattern id={`f-risca${s}`} width="9" height="10" patternUnits="userSpaceOnUse">
          <line x1="4.5" y1="0" x2="4.5" y2="10" stroke={c(0.3)} strokeWidth="0.6" strokeDasharray="1.4 0.6" />
        </pattern>
        <pattern id={`f-xadrez${s}`} width="24" height="24" patternUnits="userSpaceOnUse">
          {[1, 3, 5, 13].map((v) => (
            <g key={v}>
              <line x1="0" y1={v} x2="24" y2={v} stroke={c(0.13)} strokeWidth="0.8" />
              <line x1={v} y1="0" x2={v} y2="24" stroke={c(0.13)} strokeWidth="0.8" />
            </g>
          ))}
          <line x1="0" y1="19" x2="24" y2="19" stroke="rgb(194 160 106 / 0.35)" strokeWidth="0.6" />
          <line x1="19" y1="0" x2="19" y2="24" stroke="rgb(194 160 106 / 0.35)" strokeWidth="0.6" />
        </pattern>
        <pattern id={`f-linho${s}`} width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M0,1.5 H4 M2,4.5 H7 M1,6.2 H3" stroke={c(0.12)} strokeWidth="0.7" />
          <path d="M1.5,0 V3 M5,2 V6" stroke={c(0.07)} strokeWidth="0.6" />
        </pattern>
      </>
    );
  };
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <linearGradient id="sh-h" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.42" />
          <stop offset="0.35" stopColor="#000" stopOpacity="0.08" />
          <stop offset="0.75" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="sh-full" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.35" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="sh-v" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.28" />
        </linearGradient>
        <linearGradient id="satin" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.7" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="brass" x1="0" x2="1">
          <stop offset="0" stopColor="#6e5530" />
          <stop offset="0.5" stopColor="#e2c793" />
          <stop offset="1" stopColor="#6e5530" />
        </linearGradient>
        <radialGradient id="btn" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        {fabrics(false)}
        {fabrics(true)}
        <filter id="drop" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.35" />
        </filter>
      </defs>
    </svg>
  );
}

function Button({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} stroke={shade(color, -0.4)} strokeWidth="0.6" />
      <circle cx={x} cy={y} r={r} fill="url(#btn)" />
    </g>
  );
}

/* ----------------------------------------------------------------- camadas */
export type Layer = { id: string; piece: PieceId | null; z: number; node: React.ReactNode };

export function suitLayers(c: SuitConfig): Layer[] {
  const suit = find(SUIT_TONES, c.suit).hex;
  const shirt = find(SHIRT_TONES, c.shirt).hex;
  const tie = find(TIE_TONES, c.tie).hex;
  const vestTone = find(VEST_TONES, c.vest);
  const vest = vestTone.id === "terno" ? suit : vestTone.hex;
  const vestFabric = vestTone.id === "terno" ? c.fabric : "liso";
  const lapelColor = c.lapel === "xale" ? shade(suit, -0.25) : suit;
  const squareColor = c.tieStyle === "sem" ? "#f7f5f0" : shade(tie, 0.15);
  const buttonColor = isLight(suit) ? shade(suit, -0.55) : shade(suit, -0.2);

  return [
    {
      id: "manequim",
      piece: null,
      z: 0,
      node: (
        <>
          <ellipse cx="200" cy="606" rx="74" ry="10" fill="url(#brass)" />
          <rect x="196" y="496" width="8" height="110" fill="url(#brass)" />
          <Mirrored>
            <path d={P.arm} fill="#e8dfcf" stroke="#cbbfa9" strokeWidth="0.8" />
            <path d={P.arm} fill="url(#sh-h)" />
            <ellipse cx="83" cy="468" rx="12" ry="17" fill="#e8dfcf" stroke="#cbbfa9" strokeWidth="0.8" />
          </Mirrored>
          <path d={P.torso} fill="#ece4d6" stroke="#cbbfa9" strokeWidth="0.8" />
          <path d={P.torso} fill="url(#sh-full)" />
          <path d="M200,100 V500" stroke="#c9bca5" strokeWidth="0.8" strokeDasharray="3 3" />
          <path d={P.neck} fill="#e3d9c8" />
          <path d={P.neck} fill="url(#sh-full)" />
          <ellipse cx="200" cy="44" rx="22" ry="7" fill="#3a2a1e" />
          <rect x="197" y="22" width="6" height="22" rx="2" fill="url(#brass)" />
          <circle cx="200" cy="20" r="6" fill="url(#brass)" />
        </>
      ),
    },
    {
      id: "camisa",
      piece: "camisa",
      z: 3,
      node: (
        <>
          <Mirrored>
            <Cloth d={P.shirtSleeve} color={shirt} />
            <Cloth d={P.shirtHalf} color={shirt} />
            <Cloth d={P.cuff} color={shade(shirt, -0.03)} />
          </Mirrored>
          <path d="M200,112 V500" stroke={shade(shirt, -0.25)} strokeWidth="0.8" />
          {[150, 200, 250, 300, 350, 400, 450].map((y) => (
            <Button key={y} x={203} y={y} r={2.2} color={shade(shirt, -0.08)} />
          ))}
          <Button x={72} y={447} r={2} color={shade(shirt, -0.08)} />
          <Button x={328} y={447} r={2} color={shade(shirt, -0.08)} />
        </>
      ),
    },
    {
      id: "calca",
      piece: "calca",
      z: 4,
      node: (
        <>
          <Mirrored>
            <Cloth d={P.trousersHalf} color={suit} fabric={c.fabric} />
            <path d="M134,340 H200" stroke={shade(suit, -0.45)} strokeWidth="0.8" />
            <path d="M162,404 L160,500" stroke={shade(suit, 0.18)} strokeWidth="0.7" opacity="0.6" />
            <path d="M154,326 V340 M182,326 V340" stroke={shade(suit, -0.45)} strokeWidth="1.4" />
          </Mirrored>
          <path d="M200,340 C200,372 198,392 191,404" stroke={shade(suit, -0.45)} strokeWidth="0.8" fill="none" />
          <Button x={200} y={333} r={2.6} color={buttonColor} />
        </>
      ),
    },
    // Espessura do tecido: cópias escuras da silhueta entre as camadas (aparecem ao girar)
    ...[1.5, 3.5].map((z) => ({
      id: `calca-borda-${z}`,
      piece: "calca" as const,
      z,
      node: (
        <Mirrored>
          <path d={P.trousersHalf} fill={shade(suit, -0.45)} />
        </Mirrored>
      ),
    })),
    ...[5.5, 8.5, 10].map((z) => ({
      id: `blazer-borda-${z}`,
      piece: "blazer" as const,
      z,
      node: (
        <Mirrored>
          <path d={P.blazerHalf} fill={shade(suit, -0.5)} />
          <path d={P.blazerSleeve} fill={shade(suit, -0.5)} />
        </Mirrored>
      ),
    })),
    {
      id: "gola-blazer",
      piece: "blazer",
      z: 5,
      node: <Cloth d={P.blazerCollar} color={shade(suit, -0.2)} half={false} />,
    },
    {
      id: "colarinho",
      piece: "camisa",
      z: 8,
      node: (
        <>
          <Cloth d={P.collarBand} color={shade(shirt, -0.05)} half={false} />
          <Mirrored>
            <Cloth d={P.collarPoint} color={shirt} />
          </Mirrored>
        </>
      ),
    },
    {
      id: "gravata",
      piece: "gravata",
      z: 6,
      node:
        c.tieStyle === "gravata" ? (
          <>
            <Cloth d={P.tieBlade} color={tie} half={false} />
            <path d="M200,140 L200,300" stroke={shade(tie, 0.2)} strokeWidth="0.5" opacity="0.5" />
            <Cloth d={P.tieKnot} color={shade(tie, -0.08)} half={false} />
          </>
        ) : c.tieStyle === "borboleta" ? (
          <>
            <Mirrored>
              <Cloth d={P.bowWing} color={tie} />
            </Mirrored>
            <rect x="192" y="108" width="16" height="18" rx="4" fill={shade(tie, -0.15)} stroke={shade(tie, -0.4)} strokeWidth="0.6" />
          </>
        ) : null,
    },
    {
      id: "colete",
      piece: "colete",
      z: 7.5,
      node: (
        <>
          <Mirrored>
            <Cloth d={P.vestHalf} color={vest} fabric={vestFabric} />
            <Cloth d={P.vestPocket} color={shade(vest, -0.12)} stroke={false} />
          </Mirrored>
          {[270, 294, 318, 342].map((y) => (
            <Button key={y} x={200} y={y} r={3} color={isLight(vest) ? shade(vest, -0.5) : shade(vest, -0.25)} />
          ))}
        </>
      ),
    },
    {
      id: "blazer",
      piece: "blazer",
      z: 11,
      node: (
        <g filter="url(#drop)">
          <Mirrored>
            <Cloth d={P.blazerHalf} color={suit} fabric={c.fabric} />
            <path d={P.dart} stroke={shade(suit, -0.35)} strokeWidth="0.7" fill="none" />
            <Cloth d={P.blazerSleeve} color={suit} fabric={c.fabric} />
            {[0, 1, 2].map((i) => (
              <Button key={i} x={84 + i * 6} y={436 - i * 0.6} r={2.1} color={buttonColor} />
            ))}
            <Cloth d={P.pocketFlap} color={suit} fabric={c.fabric} />
            <Cloth d={P.lapel[c.lapel]} color={lapelColor} fabric={c.lapel === "xale" ? undefined : c.fabric} />
            {c.lapel === "xale" && <path d={P.lapel.xale} fill="url(#satin)" />}
          </Mirrored>
          <Cloth d={P.chestWelt} color={suit} fabric={c.fabric} />
          <path d="M168,128 L171,130" stroke={shade(suit, 0.35)} strokeWidth="1.2" strokeLinecap="round" opacity={c.lapel === "xale" ? 0 : 1} />
          <Button x={200} y={336} r={5.5} color={c.lapel === "xale" ? "#121214" : buttonColor} />
        </g>
      ),
    },
    {
      id: "lenco",
      piece: "lenco",
      z: 12,
      node: (
        <>
          <Cloth d={P.square} color={squareColor} half={false} />
          <Cloth d={P.chestWelt} color={suit} fabric={c.fabric} />
        </>
      ),
    },
  ];
}

/** Manequim vestido, estático (vitrine da home). */
export function SuitStatic({ config, className }: { config: SuitConfig; className?: string }) {
  return (
    <>
      <SuitDefs />
      <svg viewBox={VIEWBOX} className={className} role="img" aria-label="Manequim com terno completo">
        {suitLayers(config)
          .sort((a, b) => a.z - b.z)
          .map((l) => (
            <g key={l.id}>{l.node}</g>
          ))}
      </svg>
    </>
  );
}
