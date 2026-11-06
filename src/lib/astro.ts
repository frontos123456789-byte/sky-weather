import { getMoonIllumination, getMoonPosition, getMoonTimes } from "suncalc";

const DAY = 86400000;
const SYNODIC_MONTH = 29.530588853;

export type MoonPhaseName = {
  name: string;
  emoji: string;
};

export function phaseName(phase: number): MoonPhaseName {
  if (phase < 0.03 || phase >= 0.97) return { name: "Новолуние", emoji: "🌑" };
  if (phase < 0.22) return { name: "Растущий серп", emoji: "🌒" };
  if (phase < 0.28) return { name: "Первая четверть", emoji: "🌓" };
  if (phase < 0.47) return { name: "Растущая Луна", emoji: "🌔" };
  if (phase < 0.53) return { name: "Полнолуние", emoji: "🌕" };
  if (phase < 0.72) return { name: "Убывающая Луна", emoji: "🌖" };
  if (phase < 0.78) return { name: "Последняя четверть", emoji: "🌗" };
  return { name: "Убывающий серп", emoji: "🌘" };
}

export type MoonInfo = {
  fraction: number; // 0..1
  phase: number; // 0..1  (0 new, .5 full)
  phaseName: string;
  emoji: string;
  ageDays: number;
  altitude: number; // degrees above horizon
  azimuth: number; // degrees from north, clockwise
  distanceKm: number;
};

export function moonNow(date: Date, lat: number, lon: number): MoonInfo {
  const ill = getMoonIllumination(date);
  const pos = getMoonPosition(date, lat, lon);
  const p = phaseName(ill.phase);
  return {
    fraction: ill.fraction,
    phase: ill.phase,
    phaseName: p.name,
    emoji: p.emoji,
    ageDays: ill.phase * SYNODIC_MONTH,
    // suncalc v2: degrees, apparent altitude; azimuth clockwise from north
    altitude: pos.altitude,
    azimuth: ((pos.azimuth % 360) + 360) % 360,
    distanceKm: pos.distance,
  };
}

export type MoonEvents = {
  rise: number | null;
  set: number | null;
};

/**
 * Moon rise/set within the location's local calendar day.
 * `offsetSec` is the location's UTC offset (from the weather API).
 */
export function moonEvents(
  nowMs: number,
  lat: number,
  lon: number,
  offsetSec: number,
): MoonEvents {
  const t = getMoonTimes(new Date(nowMs), lat, lon, Math.round(offsetSec / 60));
  return {
    rise: t.rise ? t.rise.getTime() : null,
    set: t.set ? t.set.getTime() : null,
  };
}

/** Signed distance of phase from target in range [-0.5, 0.5). */
function phaseDelta(ms: number, target: number): number {
  const p = getMoonIllumination(new Date(ms)).phase;
  return ((((p - target) % 1) + 1.5) % 1) - 0.5;
}

function findNext(fromMs: number, target: number): number | null {
  const STEP = 3 * 3600 * 1000;
  let prevT = fromMs;
  let prev = phaseDelta(prevT, target);
  for (let t = fromMs + STEP; t < fromMs + 32 * DAY; t += STEP) {
    const cur = phaseDelta(t, target);
    if (prev < 0 && cur >= 0 && cur - prev < 0.2) {
      let lo = prevT;
      let hi = t;
      for (let i = 0; i < 22; i++) {
        const mid = (lo + hi) / 2;
        if (phaseDelta(mid, target) < 0) lo = mid;
        else hi = mid;
      }
      return (lo + hi) / 2;
    }
    prevT = t;
    prev = cur;
  }
  return null;
}

export function nextPhases(fromMs: number): {
  newMoon: number | null;
  fullMoon: number | null;
} {
  return { newMoon: findNext(fromMs, 0), fullMoon: findNext(fromMs, 0.5) };
}

/** Geometry for rendering the lit part of the Moon as an SVG path (r = 50, c = 60,60). */
export function moonPath(phase: number): { d: string; mirror: boolean } {
  const waxing = phase < 0.5;
  const rx = Math.abs(Math.cos(phase * 2 * Math.PI)) * 50;
  const p = waxing ? phase : phase - 0.5; // 0..0.5 within half-cycle
  // waxing: crescent then gibbous; waning: gibbous then crescent
  const gibbous = waxing ? p > 0.25 : p < 0.25;
  const d = `M60,10 A50,50 0 0 1 60,110 A${rx.toFixed(2)},50 0 0 ${
    gibbous ? 1 : 0
  } 60,10 Z`;
  return { d, mirror: !waxing };
}
