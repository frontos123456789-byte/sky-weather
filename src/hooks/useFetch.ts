"use client";

import { useCallback, useEffect, useState } from "react";

type State<T> = {
  key: string | null;
  data: T | null;
  error: string | null;
  done: boolean;
};

/**
 * Minimal data hook: loads `url`, keeps last good data on refresh errors,
 * auto-refreshes every `refreshMs` and exposes `reload`.
 */
export function useFetch<T>(url: string | null, refreshMs = 10 * 60 * 1000) {
  const [state, setState] = useState<State<T>>({
    key: null,
    data: null,
    error: null,
    done: false,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? `Ошибка загрузки (HTTP ${res.status})`);
        }
        return (await res.json()) as T;
      })
      .then((data) =>
        setState({ key: url, data, error: null, done: true }),
      )
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        const message =
          e instanceof Error ? e.message : "Не удалось загрузить данные";
        setState((s) => ({
          key: url,
          data: s.key === url ? s.data : null,
          error: message,
          done: true,
        }));
      });
    return () => ctrl.abort();
  }, [url, tick]);

  useEffect(() => {
    if (!url || !refreshMs) return;
    const id = setInterval(() => setTick((t) => t + 1), refreshMs);
    return () => clearInterval(id);
  }, [url, refreshMs]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, done: false, error: null }));
    setTick((t) => t + 1);
  }, []);

  const current = state.key === url;
  return {
    data: current ? state.data : null,
    error: current ? state.error : null,
    loading: !!url && !(current && state.done),
    reload,
  };
}
