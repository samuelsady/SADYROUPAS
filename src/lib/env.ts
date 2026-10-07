import "server-only";

/**
 * Leitura centralizada das variáveis de ambiente do servidor.
 * Nenhum segredo é exposto ao navegador (nada aqui usa NEXT_PUBLIC_).
 */
function optional(name: string) {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const env = {
  get authSecret() {
    const v = optional("AUTH_SECRET");
    if (!v || v.length < 32) {
      if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET ausente ou curto (mínimo 32 caracteres).");
      return "dev-only-insecure-secret-change-me-0123456789";
    }
    return v;
  },
  get appUrl() {
    return optional("APP_URL") ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  },
  whatsapp: {
    get accessToken() {
      return optional("WHATSAPP_ACCESS_TOKEN");
    },
    get phoneNumberId() {
      return optional("WHATSAPP_PHONE_NUMBER_ID");
    },
    get businessAccountId() {
      return optional("WHATSAPP_BUSINESS_ACCOUNT_ID");
    },
    get apiVersion() {
      return optional("WHATSAPP_API_VERSION") ?? "v21.0";
    },
    get configured() {
      return Boolean(this.accessToken && this.phoneNumberId);
    },
  },
  storage: {
    get supabaseUrl() {
      return optional("SUPABASE_URL");
    },
    get serviceKey() {
      return optional("STORAGE_KEY");
    },
    get bucket() {
      return optional("STORAGE_BUCKET") ?? "produtos";
    },
  },
  get printAgentToken() {
    return optional("PRINT_AGENT_TOKEN");
  },
  get cronSecret() {
    return optional("CRON_SECRET");
  },
};
