export type OutgoingWhatsApp = {
  to: string; // dígitos com DDI
  body: string;
  /** Template aprovado na Meta (obrigatório para iniciar conversa fora da janela de 24h) */
  template?: { name: string; language: string; params: string[] };
};

export type SendResult = { providerMessageId: string; simulated: boolean };

export interface WhatsAppProvider {
  readonly name: string;
  send(message: OutgoingWhatsApp): Promise<SendResult>;
}
