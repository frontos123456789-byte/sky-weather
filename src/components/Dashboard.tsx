"use client";

import { useCallback, useEffect, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import type { GeomagData, Location, SunData, WeatherData } from "@/lib/types";
import { fmtDateTime } from "@/lib/format";
import { GeomagSection } from "./GeomagSection";
import { LocationSearch } from "./LocationSearch";
import { MoonSection } from "./MoonSection";
import { SunSection } from "./SunSection";
import { WeatherSection } from "./WeatherSection";
import { Section, Skeleton } from "./ui";

const STORAGE_KEY = "sky-weather.location.v1";
const DEFAULT_LOCATION: Location = {
  lat: 55.7558,
  lon: 37.6173,
  name: "Москва",
  country: "Россия",
};

const NAV = [
  { href: "#weather", label: "Погода" },
  { href: "#sun", label: "Солнце" },
  { href: "#moon", label: "Луна" },
  { href: "#geomag", label: "Геомагнитка" },
];

function loadSaved(): Location | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Location;
    if (
      typeof v.lat === "number" &&
      typeof v.lon === "number" &&
      typeof v.name === "string"
    ) {
      return v;
    }
  } catch {
    /* ignore corrupted storage */
  }
  return null;
}

export function Dashboard() {
  const [location, setLocation] = useState<Location | null>(null);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);

  const save = useCallback((loc: Location) => {
    setLocation(loc);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, []);

  const locate = useCallback(
    (silent: boolean) => {
      if (!("geolocation" in navigator)) {
        if (!silent) setNotice("Геолокация не поддерживается браузером.");
        return false;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          let name = "Ваше местоположение";
          let country: string | undefined;
          try {
            const res = await fetch(`/api/reverse?lat=${lat}&lon=${lon}`);
            if (res.ok) {
              const d = (await res.json()) as {
                place: { name: string; country?: string } | null;
              };
              if (d.place) {
                name = d.place.name;
                country = d.place.country;
              }
            }
          } catch {
            /* keep fallback name */
          }
          save({ lat, lon, name, country });
          setNotice(null);
          setLocating(false);
        },
        (err) => {
          setLocating(false);
          if (!silent) {
            setNotice(
              err.code === err.PERMISSION_DENIED
                ? "Доступ к геолокации запрещён — выберите город вручную."
                : "Не удалось определить местоположение — выберите город вручную.",
            );
          } else {
            setNotice(
              "Геолокация недоступна — показана Москва. Найдите свой город в поиске.",
            );
          }
        },
        { timeout: 10000, maximumAge: 10 * 60 * 1000 },
      );
      return true;
    },
    [save],
  );

  // Initial location: saved → browser geolocation → default city.
  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      setLocation(saved);
      return;
    }
    setLocation(DEFAULT_LOCATION);
    locate(true);
  }, [locate]);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const weatherUrl = location
    ? `/api/weather?lat=${location.lat.toFixed(3)}&lon=${location.lon.toFixed(3)}`
    : null;
  const weather = useFetch<WeatherData>(weatherUrl);
  const sun = useFetch<SunData>("/api/sun", 15 * 60 * 1000);
  const geomag = useFetch<GeomagData>("/api/geomag", 5 * 60 * 1000);

  const offsetSec =
    weather.data?.utcOffsetSeconds ??
    (location ? Math.round(location.lon / 15) * 3600 : 0);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between gap-4">
            <a href="#top" className="flex items-center gap-2 text-lg font-semibold text-white">
              <span aria-hidden>🌤️</span> Небесная погода
            </a>
            <nav className="flex gap-1 overflow-x-auto text-sm sm:hidden">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10">
                  {n.label}
                </a>
              ))}
            </nav>
          </div>
          <nav className="hidden gap-1 text-sm sm:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white">
                {n.label}
              </a>
            ))}
          </nav>
          <LocationSearch
            onSelect={save}
            onLocate={() => locate(false)}
            locating={locating}
          />
        </div>
      </header>

      <main id="top" className="mx-auto max-w-6xl space-y-10 px-4 py-8">
        <div>
          {location ? (
            <>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {location.name}
                {location.country && (
                  <span className="ml-2 text-lg font-normal text-slate-400">
                    {location.country}
                  </span>
                )}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {now != null ? fmtDateTime(now, offsetSec) : "\u00A0"} ·{" "}
                {location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°
              </p>
            </>
          ) : (
            <Skeleton className="h-14 w-72" />
          )}
          {notice && (
            <p
              role="status"
              className="mt-3 inline-block rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200"
            >
              {notice}
            </p>
          )}
        </div>

        <Section id="weather" icon="🌦️" title="Погода" subtitle="Open-Meteo · обновляется каждые 10 минут">
          <WeatherSection
            data={weather.data}
            loading={weather.loading || !location}
            error={weather.error}
            onRetry={weather.reload}
          />
        </Section>

        <Section id="sun" icon="☀️" title="Солнце" subtitle="NOAA SWPC · пятна, вспышки, солнечный цикл">
          <SunSection
            data={sun.data}
            loading={sun.loading}
            error={sun.error}
            onRetry={sun.reload}
            geomag={geomag.data}
            offsetSec={offsetSec}
          />
        </Section>

        <Section id="moon" icon="🌙" title="Луна" subtitle="Расчёт локально (suncalc) для выбранного города">
          {location ? (
            <MoonSection lat={location.lat} lon={location.lon} offsetSec={offsetSec} />
          ) : (
            <Skeleton className="h-64" />
          )}
        </Section>

        <Section id="geomag" icon="🧲" title="Геомагнитное поле" subtitle="Kp-индекс · NOAA SWPC">
          <GeomagSection
            data={geomag.data}
            loading={geomag.loading}
            error={geomag.error}
            onRetry={geomag.reload}
            offsetSec={offsetSec}
          />
        </Section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-slate-500">
        Данные: Open-Meteo, NOAA SWPC, BigDataCloud · Луна — suncalc. Не является
        медицинской рекомендацией.
      </footer>
    </div>
  );
}
