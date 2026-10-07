/** O que o cliente pode fazer pelo link do agendamento, em um dado instante. */
export function selfServiceState(a: { status: string; startsAt: Date }, cutoffHours: number, now = new Date()) {
  const active = a.status === "SCHEDULED" || a.status === "CONFIRMED";
  const past = a.startsAt.getTime() < now.getTime();
  const canChange = active && a.startsAt.getTime() - now.getTime() >= cutoffHours * 3_600_000;
  return { active, past, canChange };
}
