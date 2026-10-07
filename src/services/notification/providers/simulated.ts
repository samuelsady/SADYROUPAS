import { randomUUID } from "node:crypto";
import type { OutgoingWhatsApp, SendResult, WhatsAppProvider } from "./types";

/**
 * Modo SIMULATED: nenhuma mensagem real é enviada. A mensagem fica registrada
 * na tabela Notification (status SIMULADO) e no log do servidor.
 */
export class SimulatedWhatsAppProvider implements WhatsAppProvider {
  readonly name = "simulated";

  async send(message: OutgoingWhatsApp): Promise<SendResult> {
    console.info(`[whatsapp:SIMULADO] destino=+${message.to}\n${message.body}`);
    return { providerMessageId: `sim_${randomUUID()}`, simulated: true };
  }
}
