/** Ocasiões que organizam o catálogo (coleções). Slugs gravados em Product.occasions. */
export const OCCASIONS = [
  { slug: "casamento", name: "Casamento", description: "Noivos, padrinhos e convidados — do dia à noite." },
  { slug: "formatura", name: "Formatura", description: "Becas, ternos e smokings para colação e baile." },
  { slug: "padrinhos", name: "Padrinhos", description: "Tons combinando para o cortejo." },
  { slug: "gala", name: "Gala & noite", description: "Smokings e cortes de gala para eventos noturnos." },
  { slug: "social", name: "Eventos sociais", description: "Batizados, aniversários, trabalho e cerimônias." },
] as const;

export type OccasionSlug = (typeof OCCASIONS)[number]["slug"];

export const occasionName = (slug: string) => OCCASIONS.find((o) => o.slug === slug)?.name ?? slug;
export const isOccasion = (slug: string | undefined): slug is OccasionSlug => OCCASIONS.some((o) => o.slug === slug);
