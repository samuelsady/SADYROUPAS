/** Remonta a cada navegação no painel: entrada suave do conteúdo. */
export default function PanelTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
