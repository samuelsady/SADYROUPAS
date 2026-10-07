"use client";

import { useEffect, useState } from "react";

export type DayAvailability = { date: string; available: number };
export type SlotOption = { time: string; available: boolean };

type Result<T> = { key: string; data: T | null; error: string | null };

/**
 * Busca JSON quando `url` muda. "Carregando" é derivado: o último resultado
 * ainda não corresponde à URL atual (sem setState síncrono no efeito).
 */
function useFetchJson<T>(url: string | null) {
  const [result, setResult] = useState<Result<T>>({ key: "", data: null, error: null });
  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal, cache: "no-store" })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erro ao carregar horários.");
        setResult({ key: url, data: json as T, error: null });
      })
      .catch((e: Error) => {
        if (e.name !== "AbortError") setResult({ key: url, data: null, error: e.message });
      });
    return () => ctrl.abort();
  }, [url]);
  const current = url !== null && result.key === url;
  return { loading: url !== null && !current, data: current ? result.data : null, error: current ? result.error : null };
}

/** Dias com horários livres para o serviço (calculados no servidor). */
export function useOpenDays(serviceId: string | null, refreshKey = 0) {
  const url = serviceId ? `/api/public/availability/days?serviceId=${encodeURIComponent(serviceId)}&days=30&r=${refreshKey}` : null;
  const { loading, data, error } = useFetchJson<{ days: DayAvailability[] }>(url);
  return { loading, error, days: data?.days ?? [] };
}

/** Horários de um dia. O painel usa o endpoint protegido (sem antecedência mínima). */
export function useSlots(serviceId: string | null, date: string | null, opts: { admin?: boolean; ignoreId?: string; refreshKey?: number } = {}) {
  const { admin, ignoreId, refreshKey = 0 } = opts;
  let url: string | null = null;
  if (serviceId && date) {
    const q = new URLSearchParams({ serviceId, date, r: String(refreshKey), ...(ignoreId ? { ignoreId } : {}) });
    url = `${admin ? "/api/admin/availability" : "/api/public/availability"}?${q}`;
  }
  const { loading, data, error } = useFetchJson<{ slots: SlotOption[] }>(url);
  return { loading, error, slots: data?.slots ?? [] };
}
