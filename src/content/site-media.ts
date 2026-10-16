/**
 * Fotos e vídeos reais da Sady usados no site.
 *
 * ABERTURA (fotos do manequim sendo vestido):
 *   1. Fotografe um manequim na loja com o celular num tripé — mesma posição,
 *      mesma luz, fundo escuro — uma foto por etapa: manequim, camisa, calça,
 *      gravata, colete, blazer, lenço (6 a 8 fotos, em pé, proporção 4:5).
 *   2. Salve em public/abertura (ex.: 01.jpg, 02.jpg…) e liste abaixo, em ordem.
 *   Com 3 fotos ou mais, a abertura usa as fotos; sem fotos, usa o desenho.
 *
 * VÍDEO DA LOJA (página inicial):
 *   Vídeo curto (10–20 s), sem som, na horizontal: a loja, as araras, a equipe,
 *   um ajuste sendo feito. Salve em public/loja/video.mp4 (até ~8 MB) com uma
 *   imagem de capa (public/loja/capa.jpg) e preencha STORE_VIDEO abaixo.
 */

export type IntroPhoto = { src: string; caption?: { eyebrow: string; text: string } };

export const INTRO_PHOTOS: IntroPhoto[] = [
  // { src: "/abertura/01.jpg" },
  // { src: "/abertura/02.jpg", caption: { eyebrow: "A camisa", text: "Algodão que veste leve" } },
];

export const STORE_VIDEO: { src: string; poster: string; title?: string } | null = null;
// Exemplo: { src: "/loja/video.mp4", poster: "/loja/capa.jpg", title: "Por dentro da Sady" }
