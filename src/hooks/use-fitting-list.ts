"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Lista de provas do cliente: guardada no navegador (sem login), enviada junto
 * com o agendamento. O servidor revalida produtos e tamanhos.
 */
export type FittingEntry = { slug: string; name: string; size: string | null; image: string | null };

const KEY = "sady:lista-de-provas";
/** Evento para abrir o painel da lista de provas (ex.: pela barra inferior). */
export const OPEN_FITTING_EVENT = "sady:abrir-provador";
const EVENT = "sady:lista-de-provas";
export const FITTING_MAX = 12;

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function write(list: FittingEntry[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* navegação privada sem storage: a lista vale só nesta página */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

function parse(raw: string): FittingEntry[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => x && typeof x.slug === "string").slice(0, FITTING_MAX) : [];
  } catch {
    return [];
  }
}

export const fittingList = {
  add(entry: FittingEntry) {
    const list = parse(read());
    if (list.some((e) => e.slug === entry.slug && e.size === entry.size)) return "exists" as const;
    if (list.length >= FITTING_MAX) return "full" as const;
    write([...list, entry]);
    return "added" as const;
  },
  remove(slug: string, size: string | null) {
    write(parse(read()).filter((e) => !(e.slug === slug && e.size === size)));
  },
  clear() {
    write([]);
  },
};

export function useFittingList() {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  return useMemo(() => parse(raw), [raw]);
}
