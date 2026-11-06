import type {
  ActivityDay,
  CyclePoint,
  FlareEvent,
  SolarCycle,
  SunData,
} from "./types";

const BASE = "https://services.swpc.noaa.gov";
export const SUN_REVALIDATE = 900; // 15 min

async function getJson<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`NOAA ${path} responded ${res.status}`);
  return (await res.json()) as T;
}

type Region = {
  observed_date: string;
  region: number;
  number_spots: number | null;
};

type Flare = { max_time: string; max_class: string };

type CycleRow = {
  "time-tag": string;
  ssn: number;
  smoothed_ssn: number;
  observed_swpc_ssn: number;
  "f10.7": number;
};

type PredRow = { "time-tag": string; predicted_ssn: number };

type ProbRow = {
  date: string;
  m_class_1_day: number;
  m_class_2_day: number;
  m_class_3_day: number;
  x_class_1_day: number;
  x_class_2_day: number;
  x_class_3_day: number;
};

type Scales = Record<string, { R?: { Scale: string | null } }>;

const CLASS_BASE: Record<string, number> = { A: 1, B: 2, C: 3, M: 4, X: 5 };

/** "M3.5" → 4.54 (continuous log-scale value, A=1 … X=5). */
function flareLevel(cls: string): number | null {
  const letter = cls[0]?.toUpperCase();
  const mant = parseFloat(cls.slice(1));
  const base = CLASS_BASE[letter];
  if (!base || !isFinite(mant) || mant <= 0) return null;
  return Math.round((base + Math.log10(mant)) * 100) / 100;
}

function flareValue(cls: string): number {
  const letter = cls[0]?.toUpperCase();
  return (CLASS_BASE[letter] ?? 0) * 1000 + (parseFloat(cls.slice(1)) || 0);
}

const utc = (tag: string) => Date.parse(tag.endsWith("Z") ? tag : `${tag}Z`);

function monthIndex(tag: string): number {
  const [y, m] = tag.split("-").map(Number);
  return y * 12 + (m - 1);
}

function buildCycle(
  rows: CycleRow[],
  predicted: PredRow[] | null,
): SolarCycle | null {
  const START = "2019-12"; // start of Solar Cycle 25
  const cyc = rows.filter((r) => r["time-tag"] >= START);
  if (cyc.length === 0) return null;

  const valid = cyc.filter((r) => r.smoothed_ssn >= 0);
  const peak = valid.reduce((a, b) => (b.smoothed_ssn > a.smoothed_ssn ? b : a));

  const lastObs = [...cyc]
    .reverse()
    .find((r) => (r.observed_swpc_ssn ?? -1) >= 0 || r.ssn >= 0);
  if (!lastObs) return null;
  const currentSsn =
    lastObs.observed_swpc_ssn >= 0 ? lastObs.observed_swpc_ssn : lastObs.ssn;
  const currentMonth = lastObs["time-tag"];

  const monthsSincePeak = monthIndex(currentMonth) - monthIndex(peak["time-tag"]);
  const progress = Math.min(
    100,
    Math.max(
      0,
      ((monthIndex(currentMonth) - monthIndex(START)) / (11 * 12)) * 100,
    ),
  );

  let phase: SolarCycle["phase"];
  let phaseLabel: string;
  let description: string;
  if (Math.abs(monthsSincePeak) <= 12) {
    phase = "maximum";
    phaseLabel = "Максимум";
    description =
      "Пик цикла: пятен и вспышек больше всего. Сильные события возможны в любой момент.";
  } else if (monthsSincePeak < 0) {
    phase = "rising";
    phaseLabel = "Фаза роста";
    description = "Активность растёт: пятен становится всё больше.";
  } else if (currentSsn < 25 && monthsSincePeak > 36) {
    phase = "minimum";
    phaseLabel = "Минимум";
    description = "Солнце спокойно: пятен мало, мощные вспышки редки.";
  } else {
    phase = "declining";
    phaseLabel = "Фаза спада";
    description =
      "Активность снижается после максимума, но сильные вспышки и бури всё ещё случаются — часто в период спада.";
  }

  const series: CyclePoint[] = cyc
    .filter((r) => r.ssn >= 0 && r["time-tag"] <= currentMonth)
    .map((r) => ({ t: r["time-tag"], ssn: r.ssn, predicted: null }));

  let predictedSsn: number | null = null;
  if (predicted) {
    const future = predicted.filter((p) => p["time-tag"] >= currentMonth);
    // connect the lines at the last observed month
    if (future.length > 0 && series.length > 0) {
      series[series.length - 1].predicted = series[series.length - 1].ssn;
      for (const p of future.slice(1, 61)) {
        series.push({
          t: p["time-tag"],
          ssn: null,
          predicted: Math.round(p.predicted_ssn * 10) / 10,
        });
      }
      const nextMonth = future[1] ?? future[0];
      predictedSsn = Math.round(nextMonth.predicted_ssn * 10) / 10;
    }
  }

  return {
    number: 25,
    phase,
    phaseLabel,
    description,
    progressPct: Math.round(progress),
    startMonth: START,
    peakMonth: peak["time-tag"],
    peakSsn: peak.smoothed_ssn,
    currentMonth,
    currentSsn: Math.round(currentSsn * 10) / 10,
    predictedSsn,
    series,
  };
}

export async function getSun(): Promise<SunData> {
  const [regionsR, flaresR, cycleR, predR, probsR, scalesR] =
    await Promise.allSettled([
      getJson<Region[]>("/json/solar_regions.json", SUN_REVALIDATE),
      getJson<Flare[]>("/json/goes/primary/xray-flares-7-day.json", 600),
      getJson<CycleRow[]>(
        "/json/solar-cycle/observed-solar-cycle-indices.json",
        86400,
      ),
      getJson<PredRow[]>("/json/solar-cycle/predicted-solar-cycle.json", 86400),
      getJson<ProbRow[]>("/json/solar_probabilities.json", SUN_REVALIDATE),
      getJson<Scales>("/products/noaa-scales.json", 300),
    ]);

  if (
    regionsR.status === "rejected" &&
    flaresR.status === "rejected" &&
    cycleR.status === "rejected"
  ) {
    throw new Error("Solar data unavailable");
  }

  /* ---- sunspots per day ---- */
  const byDate = new Map<string, { groups: number; spots: number }>();
  if (regionsR.status === "fulfilled") {
    for (const r of regionsR.value) {
      const spots = r.number_spots ?? 0;
      const e = byDate.get(r.observed_date) ?? { groups: 0, spots: 0 };
      if (spots > 0) e.groups += 1;
      e.spots += spots;
      byDate.set(r.observed_date, e);
    }
  }

  /* ---- flares ---- */
  const flaresRaw = flaresR.status === "fulfilled" ? flaresR.value : [];
  const counts = { c: 0, m: 0, x: 0 };
  const strong: FlareEvent[] = [];
  const peakByDay = new Map<string, string>();
  for (const f of flaresRaw) {
    const letter = f.max_class?.[0]?.toUpperCase();
    if (letter === "C") counts.c++;
    if (letter === "M") counts.m++;
    if (letter === "X") counts.x++;
    if (letter === "M" || letter === "X") {
      strong.push({ time: utc(f.max_time), cls: f.max_class });
    }
    const day = f.max_time.slice(0, 10);
    const cur = peakByDay.get(day);
    if (!cur || flareValue(f.max_class) > flareValue(cur)) {
      peakByDay.set(day, f.max_class);
    }
  }
  strong.sort((a, b) => b.time - a.time);
  const strongest =
    flaresRaw.length > 0
      ? flaresRaw.reduce((a, b) =>
          flareValue(b.max_class) > flareValue(a.max_class) ? b : a,
        ).max_class
      : null;

  /* ---- activity chart: last 14 days ---- */
  const dates = [...byDate.keys()].sort().slice(-14);
  const activity: ActivityDay[] = dates.map((date) => {
    const e = byDate.get(date)!;
    const cls = peakByDay.get(date) ?? null;
    return {
      date,
      sunspots: e.spots,
      groups: e.groups,
      wolf: e.groups * 10 + e.spots,
      flareClass: cls,
      flareLevel: cls ? flareLevel(cls) : null,
    };
  });
  const latest = activity[activity.length - 1] ?? null;

  /* ---- cycle ---- */
  const cycle =
    cycleR.status === "fulfilled"
      ? buildCycle(cycleR.value, predR.status === "fulfilled" ? predR.value : null)
      : null;

  const f107 =
    cycleR.status === "fulfilled"
      ? (() => {
          const last = [...cycleR.value].reverse().find((r) => r["f10.7"] > 0);
          return last ? Math.round(last["f10.7"]) : null;
        })()
      : null;

  /* ---- flare probabilities ---- */
  let probabilities: SunData["probabilities"] = null;
  if (probsR.status === "fulfilled" && probsR.value.length > 0) {
    const p = [...probsR.value].sort((a, b) =>
      String(b.date).localeCompare(String(a.date)),
    )[0];
    probabilities = {
      m: [p.m_class_1_day, p.m_class_2_day, p.m_class_3_day],
      x: [p.x_class_1_day, p.x_class_2_day, p.x_class_3_day],
    };
  }

  const rScale =
    scalesR.status === "fulfilled"
      ? Number(scalesR.value["0"]?.R?.Scale ?? NaN)
      : NaN;

  return {
    updatedAt: Date.now(),
    sunspotNumber: latest ? latest.wolf : null,
    sunspotCount: latest ? latest.sunspots : null,
    sunspotGroups: latest ? latest.groups : null,
    regionsDate: latest ? latest.date : null,
    f107,
    flares: strong.slice(0, 8),
    flareCounts: counts,
    strongestFlare: strongest,
    probabilities,
    radioBlackoutScale: Number.isFinite(rScale) ? rScale : null,
    activity,
    cycle,
  };
}
