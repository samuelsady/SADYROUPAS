import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Câmera liberada só para o próprio site (leitor de QR Code do estoque)
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const supabaseHost = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).hostname : undefined;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // "npm run dev:rede": permite abrir o servidor de desenvolvimento pelo celular na mesma rede Wi-Fi
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  serverExternalPackages: ["@react-pdf/renderer", "bcryptjs"],
  experimental: {
    // Upload de fotos de produto pelo painel (até 10 imagens de 5 MB, validadas no StorageService)
    serverActions: { bodySizeLimit: "25mb" },
  },
  images: {
    // Fotos de produto em alta qualidade (Next 16 exige a lista de qualidades permitidas)
    qualities: [75, 90],
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
