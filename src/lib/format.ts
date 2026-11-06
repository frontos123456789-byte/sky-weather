const MONTHS = [
  "янв",
  "фев",
  "мар",
  "апр",
  "мая",
  "июн",
  "июл",
  "авг",
  "сен",
  "окт",
  "ноя",
  "дек",
];

const WEEKDAYS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Shift epoch ms by UTC offset so that getUTC* returns location-local fields. */
function shifted(ms: number, offsetSec: number) {
  return new Date(ms + offsetSec * 1000);
}

export function fmtTime(ms: number, offsetSec: number): string {
  const d = shifted(ms, offsetSec);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function fmtDayMonth(ms: number, offsetSec: number): string {
  const d = shifted(ms, offsetSec);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function fmtDateTime(ms: number, offsetSec: number): string {
  return `${fmtDayMonth(ms, offsetSec)}, ${fmtTime(ms, offsetSec)}`;
}

export function fmtWeekday(ms: number, offsetSec: number): string {
  return WEEKDAYS[shifted(ms, offsetSec).getUTCDay()];
}

/** "2026-11-06" → "6 ноя" */
export function fmtIsoDay(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "2026-11-06" → "Пт" */
export function fmtIsoWeekday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** "2026-11-06T19:00" → "19:00" */
export function isoClock(iso: string): string {
  return iso.slice(11, 16);
}

const COMPASS = ["С", "СВ", "В", "ЮВ", "Ю", "ЮЗ", "З", "СЗ"];

export function compass(deg: number): string {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

export function uvLabel(uv: number | null): string {
  if (uv == null) return "—";
  if (uv < 3) return "Низкий";
  if (uv < 6) return "Умеренный";
  if (uv < 8) return "Высокий";
  if (uv < 11) return "Очень высокий";
  return "Экстремальный";
}

export function round(n: number, digits = 0): number {
  const k = 10 ** digits;
  return Math.round(n * k) / k;
}

export function signed(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${r}` : String(r);
}

export function hpaToMmHg(hpa: number): number {
  return Math.round(hpa * 0.750062);
}
