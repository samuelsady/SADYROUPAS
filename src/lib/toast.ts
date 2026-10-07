/** Avisos rápidos (toasts) — funciona em qualquer componente de cliente. */
export type ToastTone = "success" | "error" | "info";
export type ToastDetail = { message: string; tone?: ToastTone; action?: { label: string; href: string } };

export const TOAST_EVENT = "sady:toast";

export function toast(message: string, tone: ToastTone = "success", action?: ToastDetail["action"]) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, tone, action } }));
}
