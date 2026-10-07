import Link from "next/link";

export function Pagination({ page, pages, total, hrefFor }: { page: number; pages: number; total: number; hrefFor: (page: number) => string }) {
  if (pages <= 1) return <p className="px-5 py-3 text-xs text-muted">{total} registro(s)</p>;
  return (
    <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
      <span>{total} registro(s) · página {page} de {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={hrefFor(page - 1)} className="rounded-md border border-line px-3 py-1.5 font-semibold text-ink hover:bg-ivory">Anterior</Link>}
        {page < pages && <Link href={hrefFor(page + 1)} className="rounded-md border border-line px-3 py-1.5 font-semibold text-ink hover:bg-ivory">Próxima</Link>}
      </div>
    </div>
  );
}
