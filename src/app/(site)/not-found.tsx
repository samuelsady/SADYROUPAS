import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-site py-24 text-center">
      <p className="eyebrow">Página não encontrada</p>
      <h1 className="display mt-3 text-4xl">Não encontramos o que você procura.</h1>
      <LinkButton href="/catalogo" className="mt-8">Ver catálogo</LinkButton>
    </div>
  );
}
