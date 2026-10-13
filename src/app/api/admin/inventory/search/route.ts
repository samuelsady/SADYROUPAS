import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handler } from "@/lib/http";
import { RentalService } from "@/services/rental-workflow.service";

/** Busca de peças disponíveis/reservadas para montar uma locação. */
export const GET = handler(async (req: Request) => {
  await requireUser("inventory.manage");
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 60);
  return NextResponse.json({ pieces: await RentalService.searchPieces(q) });
});
