export type Location = {
  lat: number;
  lon: number;
  name: string;
  region?: string;
  country?: string;
};

export type GeoResult = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  region?: string;
  country?: string;
};

/* ---------------------------- Weather ---------------------------- */

export type CurrentWeather = {
  time: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  pressureHpa: number;
  windSpeed: number; // m/s
  windDir: number; // degrees
  windGust: number; // m/s
  precipitation: number; // mm
  cloudCover: number; // %
  code: number;
  isDay: boolean;
  uvIndex: number | null;
  visibilityKm: number | null;
};

export type HourlyPoint = {
  time: string; // local ISO "YYYY-MM-DDTHH:mm"
  temp: number;
  precipProb: number | null;
  precip: number;
  code: number;
  isDay: boolean;
};

export type DailyPoint = {
  date: string;
  code: number;
  tMax: number;
  tMin: number;
  precipSum: number;
  precipProbMax: number | null;
  windMax: number;
  uvMax: number | null;
  sunrise: string;
  sunset: string;
};

export type WeatherData = {
  timezone: string;
  utcOffsetSeconds: number;
  current: CurrentWeather;
  hourly: HourlyPoint[];
  daily: DailyPoint[];
};

/* ---------------------------- Space ---------------------------- */

export type FlareEvent = {
  time: number; // epoch ms (max time)
  cls: string; // e.g. M3.5
};

export type ActivityDay = {
  date: string; // YYYY-MM-DD
  sunspots: number;
  groups: number;
  wolf: number;
  flareLevel: number | null; // A=1 B=2 C=3 M=4 X=5 (+log10 mantissa)
  flareClass: string | null;
};

export type CyclePoint = {
  t: string; // YYYY-MM
  ssn: number | null;
  predicted: number | null;
};

export type SolarCycle = {
  number: number;
  phase: "minimum" | "rising" | "maximum" | "declining";
  phaseLabel: string;
  description: string;
  progressPct: number;
  startMonth: string;
  peakMonth: string;
  peakSsn: number;
  currentMonth: string;
  currentSsn: number;
  predictedSsn: number | null;
  series: CyclePoint[];
};

export type SunData = {
  updatedAt: number;
  sunspotNumber: number | null;
  sunspotCount: number | null;
  sunspotGroups: number | null;
  regionsDate: string | null;
  f107: number | null;
  flares: FlareEvent[]; // M/X flares in the last 7 days
  flareCounts: { c: number; m: number; x: number };
  strongestFlare: string | null;
  probabilities: { m: number[]; x: number[] } | null; // 1-3 day, %
  radioBlackoutScale: number | null;
  activity: ActivityDay[];
  cycle: SolarCycle | null;
};

export type KpPoint = {
  t: number; // epoch ms (start of 3h interval, UTC)
  kp: number;
  type: "observed" | "estimated" | "predicted";
};

export type GeomagDay = {
  date: string; // YYYY-MM-DD (UTC)
  maxKp: number;
  gScale: number;
  stormProbability: number | null;
  probabilities: {
    active: number;
    minor: number;
    moderate: number;
    strong: number;
  } | null;
};

export type GeomagData = {
  updatedAt: number;
  kpNow: number;
  kpNowTime: number;
  history: KpPoint[]; // last 24h
  forecast: KpPoint[]; // 3 days
  days: GeomagDay[];
  stormProbabilityToday: number | null;
};
