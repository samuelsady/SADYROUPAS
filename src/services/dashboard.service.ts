import "server-only";
import { db } from "@/database/client";
import { addDaysKey, dayRangeUtc, startOfMonthKey, todayKey } from "@/utils/datetime";
import { InventoryService } from "./inventory.service";
import { PrintService } from "./print/print.service";
import { SettingsService } from "./settings.service";

export const DashboardService = {
  async overview(now = new Date()) {
    const settings = await SettingsService.get();
    const tz = settings.timezone;
    const today = todayKey(tz, now);
    const { start, end } = dayRangeUtc(today, tz);
    const monthStart = dayRangeUtc(startOfMonthKey(today), tz).start;
    const weekAgo = dayRangeUtc(addDaysKey(today, -6), tz).start;

    const [todayAppointments, upcoming, customersTotal, customersNew, inventory, printPending, printFailed, whatsappFailed, printer] = await Promise.all([
      db.appointment.findMany({
        where: { startsAt: { gte: start, lt: end } },
        orderBy: { startsAt: "asc" },
        include: { customer: { select: { id: true, name: true, whatsapp: true } }, service: { select: { name: true } } },
      }),
      db.appointment.findMany({
        where: { startsAt: { gte: now }, status: { in: ["SCHEDULED", "CONFIRMED"] } },
        orderBy: { startsAt: "asc" },
        take: 6,
        include: { customer: { select: { id: true, name: true } }, service: { select: { name: true } } },
      }),
      db.customer.count(),
      db.customer.count({ where: { createdAt: { gte: monthStart } } }),
      InventoryService.stats(),
      db.printJob.count({ where: { status: "PRINT_PENDING" } }),
      db.printJob.count({ where: { status: "PRINT_FAILED" } }),
      db.notification.count({ where: { channel: "WHATSAPP", status: "FAILED", createdAt: { gte: weekAgo } } }),
      PrintService.printerState(now),
    ]);

    const by = (s: string) => todayAppointments.filter((a) => a.status === s).length;
    const active = todayAppointments.filter((a) => a.status === "SCHEDULED" || a.status === "CONFIRMED");

    const alerts: { tone: "gold" | "red" | "amber" | "blue"; text: string; href: string }[] = [];
    if (active.length) alerts.push({ tone: "blue", text: `${active.length} atendimento(s) hoje`, href: "/admin/agenda" });
    if (inventory.counts.RESERVED) alerts.push({ tone: "gold", text: `${inventory.counts.RESERVED} peça(s) reservada(s)`, href: "/admin/estoque?status=RESERVED" });
    if (inventory.counts.UNAVAILABLE) alerts.push({ tone: "red", text: `${inventory.counts.UNAVAILABLE} peça(s) indisponível(is)`, href: "/admin/estoque?status=UNAVAILABLE" });
    if (printPending + printFailed) alerts.push({ tone: "amber", text: `${printPending + printFailed} impressão(ões) pendente(s)`, href: "/admin/impressoes" });
    if (whatsappFailed) alerts.push({ tone: "red", text: `${whatsappFailed} mensagem(ns) de WhatsApp com falha`, href: "/admin/notificacoes?status=FAILED" });
    if (printer.state === "DESCONECTADA" && printPending) alerts.push({ tone: "amber", text: "Serviço de impressão desconectado", href: "/admin/impressoes" });

    return {
      today,
      todayAppointments,
      upcoming,
      counts: {
        today: todayAppointments.length,
        active: active.length,
        completed: by("COMPLETED"),
        cancelled: by("CANCELLED"),
        noShow: by("NO_SHOW"),
      },
      customers: { total: customersTotal, newThisMonth: customersNew },
      inventory,
      print: { pending: printPending, failed: printFailed, printer },
      alerts,
    };
  },
};
