import type { OutgoingWhatsApp, SendResult, WhatsAppProvider } from "./types";

/**
 * WhatsApp Business Platform — Cloud API oficial da Meta.
 * https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 *
 * Com template configurado envia `type: template` (necessário para mensagens
 * iniciadas pela empresa); sem template envia texto (válido apenas dentro da
 * janela de 24h após o cliente falar com a loja).
 */
export class CloudApiWhatsAppProvider implements WhatsAppProvider {
  readonly name = "cloud-api";

  constructor(
    private readonly config: { accessToken: string; phoneNumberId: string; apiVersion: string },
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(message: OutgoingWhatsApp): Promise<SendResult> {
    const payload = message.template
      ? {
          messaging_product: "whatsapp",
          to: message.to,
          type: "template",
          template: {
            name: message.template.name,
            language: { code: message.template.language },
            components: message.template.params.length
              ? [{ type: "body", parameters: message.template.params.map((text) => ({ type: "text", text })) }]
              : [],
          },
        }
      : { messaging_product: "whatsapp", to: message.to, type: "text", text: { preview_url: false, body: message.body } };

    const res = await this.fetchImpl(`https://graph.facebook.com/${this.config.apiVersion}/${this.config.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string; code?: number } };
    if (!res.ok || !json.messages?.[0]?.id) {
      throw new Error(`WhatsApp API ${res.status}: ${json.error?.message ?? "resposta inesperada"}`);
    }
    return { providerMessageId: json.messages[0].id, simulated: false };
  }
}
