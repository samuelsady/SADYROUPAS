import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "Sady Roupas — Aluguel de ternos, becas e trajes sociais em Teresina", template: "%s · Sady Roupas" },
  description: "Desde 2008 vestindo momentos especiais. Aluguel de ternos, smokings, becas, camisas e acessórios em Teresina - PI. Agende seu atendimento online.",
  icons: { icon: "/brand/logo-sady-roupas.png" },
  openGraph: { type: "website", locale: "pt_BR", siteName: "Sady Roupas", images: ["/brand/logo-sady-roupas.png"] },
};

export const viewport: Viewport = { themeColor: "#13110f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" className={`${cormorant.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
