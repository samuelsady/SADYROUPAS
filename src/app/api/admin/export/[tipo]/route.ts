import { requireUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { handler } from "@/lib/http";
import { isSheetKey, SpreadsheetService } from "@/services/spreadsheet.service";
import { todayKey } from "@/utils/datetime";

/** Download .xlsx de uma aba da planilha (com os filtros da tela) ou da planilha completa. */
export const GET = handler(async (req: Request, ctx: { params: Promise<{ tipo: string }> }) => {
  await requireUser("inventory.manage");
  const { tipo } = await ctx.params;
  if (tipo !== "completa" && !isSheetKey(tipo)) throw new AppError(404, "Planilha não encontrada.");
  const sp = new URL(req.url).searchParams;
  const filters = { de: sp.get("de") ?? undefined, ate: sp.get("ate") ?? undefined, status: sp.get("status") ?? undefined, q: sp.get("q") ?? undefined };
  const file = await SpreadsheetService.workbook(tipo, filters);
  const name = `sady-roupas-${tipo === "completa" ? "planilha" : tipo}-${todayKey()}.xlsx`;
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
});
