import { kpToG } from "./kp";
import type { GeomagData, GeomagDay, KpPoint } from "./types";

const BASE = "https://services.swpc.noaa.gov";
export const GEOMAG_REVALIDATE = 300; // 5 min

async function getText(path: string, revalidate: number): Promise<string> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`NOAA ${path} responded ${res.status}`);
  return res.text();
}

async function getJson<T>(path: string, revalidate: number): Promise<T> {
  return JSON.parse(await getText(path, revalidate)) as T;
}

type ForecastRow = {
  time_tag: string;
  kp: number;
  observed: "observed" | "estimated" | "predicted";
};

type Kp1m = { time_tag: string; estimated_kp: number; kp_index: number };

const utc = (tag: string) => Date.parse(tag.endsWith("Z") ? tag : `${tag}Z`);
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const MONTH_IDX: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

type ProbRow = {
  active: number;
  minor: number;
  moderate: number;
  strong: number;
};

/** Parse NOAA "3-day geomag forecast" text → probabilities per UTC day. */
function parseProbabilities(text: string): Map<string, ProbRow> | null {
  try {
    const issued = text.match(/:Issued:\s+(\d{4})\s+([A-Za-z]{3})\s+(\d{2})/);
    const head = text.match(
      /Activity Probabilities\s+(\d{2})\s+([A-Za-z]{3})\s*-\s*(\d{2})\s+([A-Za-z]{3})/,
    );
    if (!issued || !head) return null;
    const issuedYear = Number(issued[1]);
    const issuedMonth = MONTH_IDX[issued[2]];
    const startMonth = MONTH_IDX[head[2]];
    const startDay = Number(head[1]);
    if (startMonth === undefined) return null;
    const year = startMonth < issuedMonth ? issuedYear + 1 : issuedYear;
    const start = Date.UTC(year, startMonth, startDay);

    const row = (label: string): number[] | null => {
      const m = text.match(
        new RegExp(`${label}[^\\n]*?(\\d+)/(\\d+)/(\\d+)`, "i"),
      );
      return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
    };
    const active = row("Active");
    const minor = row("Minor storm");
    const moderate = row("Moderate storm");
    const strong = row("Strong-Extreme storm");
    if (!active || !minor || !moderate || !strong) return null;

    const map = new Map<string, ProbRow>();
    for (let i = 0; i < 3; i++) {
      map.set(isoDay(start + i * 86400000), {
        active: active[i],
        minor: minor[i],
        moderate: moderate[i],
        strong: strong[i],
      });
    }
    return map;
  } catch {
    return null;
  }
}

export async function getGeomag(): Promise<GeomagData> {
  const [forecastRes, nowRes, probRes] = await Promise.allSettled([
    getJson<ForecastRow[]>(
      "/products/noaa-planetary-k-index-forecast.json",
      GEOMAG_REVALIDATE,
    ),
    getJson<Kp1m[]>("/json/planetary_k_index_1m.json", 120),
    getText("/text/3-day-geomag-forecast.txt", 1800),
  ]);

  if (forecastRes.status !== "fulfilled") {
    throw new Error("Kp forecast unavailable");
  }

  const rows: KpPoint[] = forecastRes.value
    .filter((r) => typeof r.kp === "number")
    .map((r) => ({ t: utc(r.time_tag), kp: r.kp, type: r.observed }));

  const now = Date.now();
  const SLOT = 3 * 3600 * 1000;

  // Current Kp: latest 3-hour NOAA slot (observed/estimated). The 1-minute
  // estimate is very noisy, so it is only used as a fallback.
  const past = rows.filter((r) => r.t <= now);
  let kpNow: number | undefined;
  let kpNowTime = now;
  const lastSlot = past[past.length - 1];
  if (lastSlot) {
    kpNow = lastSlot.kp;
    kpNowTime = lastSlot.t;
  } else if (nowRes.status === "fulfilled" && nowRes.value.length > 0) {
    const last = nowRes.value[nowRes.value.length - 1];
    kpNow = last.estimated_kp ?? last.kp_index;
    kpNowTime = utc(last.time_tag);
  }
  if (kpNow === undefined) throw new Error("No Kp data");

  const history = past.filter((r) => r.t >= now - 24 * 3600 * 1000 - SLOT);

  const todayStart = Date.UTC(
    new Date(now).getUTCFullYear(),
    new Date(now).getUTCMonth(),
    new Date(now).getUTCDate(),
  );
  const forecast = rows.filter(
    (r) => r.t > now && r.t < todayStart + 3 * 86400000,
  );

  const probs =
    probRes.status === "fulfilled" ? parseProbabilities(probRes.value) : null;

  const days: GeomagDay[] = [];
  for (let i = 0; i < 3; i++) {
    const key = isoDay(todayStart + i * 86400000);
    const dayRows = rows.filter((r) => isoDay(r.t) === key);
    if (dayRows.length === 0) continue;
    const maxKp = Math.max(...dayRows.map((r) => r.kp));
    const p = probs?.get(key) ?? null;
    days.push({
      date: key,
      maxKp,
      gScale: kpToG(maxKp),
      probabilities: p,
      stormProbability: p
        ? Math.min(100, p.minor + p.moderate + p.strong)
        : null,
    });
  }

  return {
    updatedAt: now,
    kpNow: Math.round(kpNow * 100) / 100,
    kpNowTime,
    history,
    forecast,
    days,
    stormProbabilityToday: days[0]?.stormProbability ?? null,
  };
}
