"use client";

import { useEffect, useMemo, useState } from "react";
import { moonEvents, moonNow, nextPhases } from "@/lib/astro";
import { compass, fmtDateTime, fmtTime, round } from "@/lib/format";
import { Card, ProgressBar, Stat } from "./ui";
import { MoonPhase } from "./MoonPhase";

function daysUntil(target: number | null, now: number): string {
  if (target == null) return "—";
  const d = (target - now) / 86400000;
  if (d < 1) return `через ${Math.max(1, Math.round(d * 24))} ч`;
  return `через ${Math.round(d)} дн.`;
}

export function MoonSection({
  lat,
  lon,
  offsetSec,
}: {
  lat: number;
  lon: number;
  offsetSec: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const dayKey = Math.floor((now + offsetSec * 1000) / 86400000);
  const events = useMemo(
    // anchor at local noon of the location's current day
    () => moonEvents(dayKey * 86400000 - offsetSec * 1000 + 12 * 3600000, lat, lon, offsetSec),
    [dayKey, lat, lon, offsetSec],
  );
  const hourKey = Math.floor(now / (6 * 3600 * 1000));
  const phases = useMemo(
    () => nextPhases(hourKey * 6 * 3600 * 1000),
    [hourKey],
  );
  const moon = moonNow(new Date(now), lat, lon);
  const up = moon.altitude > 0;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Текущая фаза">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <MoonPhase phase={moon.phase} southern={lat < 0} size={150} />
            <div className="w-full flex-1">
              <div className="text-2xl font-semibold text-white">
                {moon.emoji} {moon.phaseName}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                Возраст Луны: {round(moon.ageDays, 1)} сут.
              </div>
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-400">Освещённость</span>
                  <span className="font-semibold text-amber-100">
                    {Math.round(moon.fraction * 100)}%
                  </span>
                </div>
                <ProgressBar value={moon.fraction * 100} color="#fde68a" />
              </div>
              <div className="mt-3 text-sm text-slate-400">
                Расстояние до Луны:{" "}
                <span className="text-slate-200">
                  {Math.round(moon.distanceKm).toLocaleString("ru-RU")} км
                </span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Положение на небе">
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            <SkyDial altitude={moon.altitude} azimuth={moon.azimuth} />
            <div className="grid w-full flex-1 grid-cols-2 gap-3">
              <Stat
                label="Высота"
                value={`${round(moon.altitude, 1)}°`}
                hint={up ? "над горизонтом" : "под горизонтом"}
              />
              <Stat
                label="Азимут"
                value={`${Math.round(moon.azimuth)}°`}
                hint={`направление: ${compass(moon.azimuth)}`}
              />
              <Stat
                icon="🌙↑"
                label="Восход Луны"
                value={events.rise != null ? fmtTime(events.rise, offsetSec) : "—"}
                hint={events.rise == null ? "нет в эти сутки" : "сегодня"}
              />
              <Stat
                icon="🌙↓"
                label="Закат Луны"
                value={events.set != null ? fmtTime(events.set, offsetSec) : "—"}
                hint={events.set == null ? "нет в эти сутки" : "сегодня"}
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-4">
            <div className="text-4xl" aria-hidden>
              🌑
            </div>
            <div>
              <div className="text-sm text-slate-400">Ближайшее новолуние</div>
              <div className="text-lg font-semibold text-white">
                {phases.newMoon ? fmtDateTime(phases.newMoon, offsetSec) : "—"}
              </div>
              <div className="text-sm text-slate-400">
                {daysUntil(phases.newMoon, now)}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="text-4xl" aria-hidden>
              🌕
            </div>
            <div>
              <div className="text-sm text-slate-400">Ближайшее полнолуние</div>
              <div className="text-lg font-semibold text-white">
                {phases.fullMoon ? fmtDateTime(phases.fullMoon, offsetSec) : "—"}
              </div>
              <div className="text-sm text-slate-400">
                {daysUntil(phases.fullMoon, now)}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

/** Polar sky chart: centre = zenith, edge = horizon, N up. */
function SkyDial({ altitude, azimuth }: { altitude: number; azimuth: number }) {
  const R = 62;
  const clamped = Math.max(0, altitude);
  const r = R * (1 - clamped / 90);
  const a = (azimuth * Math.PI) / 180;
  const x = 80 + r * Math.sin(a);
  const y = 80 - r * Math.cos(a);
  const up = altitude > 0;

  return (
    <svg width="170" height="170" viewBox="0 0 160 160" role="img" aria-label="Положение Луны на небе">
      <circle cx="80" cy="80" r={R} fill="#0b1226" stroke="#334155" />
      <circle cx="80" cy="80" r={R * (2 / 3)} fill="none" stroke="#1e293b" />
      <circle cx="80" cy="80" r={R / 3} fill="none" stroke="#1e293b" />
      <line x1="80" y1={80 - R} x2="80" y2={80 + R} stroke="#1e293b" />
      <line x1={80 - R} y1="80" x2={80 + R} y2="80" stroke="#1e293b" />
      {[
        ["С", 80, 11],
        ["В", 150, 84],
        ["Ю", 80, 154],
        ["З", 10, 84],
      ].map(([t, tx, ty]) => (
        <text
          key={t as string}
          x={tx as number}
          y={ty as number}
          fill="#94a3b8"
          fontSize="11"
          textAnchor="middle"
        >
          {t}
        </text>
      ))}
      <circle cx={x} cy={y} r="14" fill="#fde68a" opacity={up ? 0.2 : 0.05} />
      <circle
        cx={x}
        cy={y}
        r="7"
        fill={up ? "#fef3c7" : "#475569"}
        stroke={up ? "#fde68a" : "#64748b"}
        strokeDasharray={up ? undefined : "2 2"}
      />
    </svg>
  );
}
