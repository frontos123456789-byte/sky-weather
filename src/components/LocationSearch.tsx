"use client";

import { useEffect, useRef, useState } from "react";
import type { GeoResult, Location } from "@/lib/types";

export function LocationSearch({
  onSelect,
  onLocate,
  locating,
}: {
  onSelect: (loc: Location) => void;
  onLocate: () => void;
  locating: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "error" | "empty">(
    "idle",
  );
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setState("loading");
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("bad");
        const data = (await res.json()) as { results: GeoResult[] };
        setResults(data.results);
        setState(data.results.length ? "idle" : "empty");
        setOpen(true);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setResults([]);
        setState("error");
        setOpen(true);
      }
    }, 350);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pick = (r: GeoResult) => {
    onSelect({
      lat: r.lat,
      lon: r.lon,
      name: r.name,
      region: r.region,
      country: r.country,
    });
    setQuery("");
    setResults([]);
    setOpen(false);
    setState("idle");
  };

  return (
    <div className="flex w-full items-center gap-2 sm:max-w-md" ref={boxRef}>
      <div className="relative flex-1">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) pick(results[0]);
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Найти город…"
          aria-label="Поиск города"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder-slate-500 outline-none transition focus:border-sky-400/60 focus:bg-white/10"
        />
        {open && query.trim().length >= 2 && (
          <ul className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
            {state === "loading" && (
              <li className="px-4 py-3 text-sm text-slate-400">Поиск…</li>
            )}
            {state === "empty" && (
              <li className="px-4 py-3 text-sm text-slate-400">
                Ничего не найдено
              </li>
            )}
            {state === "error" && (
              <li className="px-4 py-3 text-sm text-rose-300">
                Поиск временно недоступен
              </li>
            )}
            {results.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => pick(r)}
                  className="flex w-full flex-col px-4 py-2.5 text-left transition hover:bg-white/10"
                >
                  <span className="text-sm text-white">{r.name}</span>
                  <span className="text-xs text-slate-400">
                    {[r.region, r.country].filter(Boolean).join(", ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        onClick={onLocate}
        disabled={locating}
        title="Определить моё местоположение"
        aria-label="Определить моё местоположение"
        className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:bg-white/15 disabled:opacity-50"
      >
        {locating ? "…" : "📍"}
      </button>
    </div>
  );
}
