import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/database/client";
import { TestimonialService } from "@/services/testimonial.service";
import { actor, resetDb } from "./helpers";

beforeEach(async () => {
  await resetDb();
});
afterAll(() => db.$disconnect());

describe("Depoimentos", () => {
  it("só os ativos aparecem no site; ocultar e remover funcionam", async () => {
    const t = await TestimonialService.create({ name: "Rafael Lima", detail: "Noivo · 2025", text: "Atendimento impecável, terno perfeito." }, null, actor);
    expect(await TestimonialService.listPublic()).toHaveLength(1);
    await TestimonialService.toggle(t.id, actor);
    expect(await TestimonialService.listPublic()).toHaveLength(0);
    expect(await TestimonialService.listAll()).toHaveLength(1);
    await TestimonialService.remove(t.id, actor);
    expect(await TestimonialService.listAll()).toHaveLength(0);
  });

  it("valida nome e texto", async () => {
    await expect(TestimonialService.create({ name: "R", text: "ok" }, null, actor)).rejects.toThrow();
  });
});
