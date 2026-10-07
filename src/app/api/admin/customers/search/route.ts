import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { handler } from "@/lib/http";
import { CustomerService } from "@/services/customer.service";

export const GET = handler(async (req: Request) => {
  await requireUser("customers.manage");
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  return NextResponse.json({ customers: await CustomerService.search(q) });
});
