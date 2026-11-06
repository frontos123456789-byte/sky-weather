"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeatherData } from "@/lib/types";
import {
  compass,
  fmtIsoDay,
  fmtIsoWeekday,
  hpaToMmHg,
  isoClock,
  round,
  signed,
  uvLabel,
} from "@/lib/format";
import { weatherInfo } from "@/lib/wmo";
import { Card, ErrorState, LoadingCards, Stat } from "./ui";

type Props = {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function WeatherSection({ data, loading, error, onRetry }: Props) {
  if (loading && !data) {
    return <LoadingCards heights={["h-64", "h-72", "h-80"]} />;
  }
  if (!data) {
    return (
      <ErrorState
        title="Не удалось загрузить погоду"
        message={error ?? "Сервис погоды недоступен."}
        onRetry={onRetry}
      />
    );
  }

  const c = data.current;
  const w = weatherInfo(c.code, c.isDay);
  const today = data.daily[0];

  return (
    <>
      <Card>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="text-7xl leading-none" aria-hidden>
              {w.icon}
            </div>
            <div>
              <div className="text-6xl font-light tracking-tight text-white">
                {signed(c.temp)}°
              </div>
              <div className="mt-1 text-slate-300">{w.label}</div>
              <div className="text-sm text-slate-400">
                Ощущается как {signed(c.feelsLike)}° · {signed(today.tMax)}° /{" "}
                {signed(today.tMin)}°
              </div>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-2xl lg:grid-cols-4">
            <Stat
              icon="💧"
              label="Влажность"
              value={`${Math.round(c.humidity)}%`}
            />
            <Stat
              icon="🧭"
              label="Давление"
              value={`${hpaToMmHg(c.pressureHpa)} мм`}
              hint={`${Math.round(c.pressureHpa)} гПа`}
            />
            <Stat
              icon="💨"
              label="Ветер"
              value={
                <span className="inline-flex items-center gap-1.5">
                  {round(c.windSpeed, 1)} м/с
                  <span
                    className="inline-block text-sky-300"
                    style={{ transform: `rotate(${c.windDir + 180}deg)` }}
                    aria-hidden
                  >
                    ↑
                  </span>
                </span>
              }
              hint={`${compass(c.windDir)} · порывы до ${round(c.windGust, 1)} м/с`}
            />
            <Stat
              icon="🌧️"
              label="Осадки"
              value={`${round(c.precipitation, 1)} мм`}
              hint="сейчас"
            />
            <Stat
              icon="☁️"
              label="Облачность"
              value={`${Math.round(c.cloudCover)}%`}
            />
            <Stat
              icon="🕶️"
              label="УФ-индекс"
              value={c.uvIndex != null ? round(c.uvIndex, 1) : "—"}
              hint={uvLabel(c.uvIndex)}
            />
            <Stat
              icon="👁️"
              label="Видимость"
              value={c.visibilityKm != null ? `${c.visibilityKm} км` : "—"}
            />
            <Stat
              icon="🌅"
              label="Восход / закат"
              value={`${isoClock(today.sunrise)} / ${isoClock(today.sunset)}`}
              hint="Солнце"
            />
          </div>
        </div>
      </Card>

      <Card title="Ближайшие 24 часа">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data.hourly.map((h) => ({
                label: isoClock(h.time),
                temp: h.temp,
                prob: h.precipProb ?? 0,
              }))}
              margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
            >
              <defs>
                <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                interval={2}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="t"
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(v) => `${v}°`}
                tickLine={false}
                axisLine={false}
                domain={["dataMin - 2", "dataMax + 2"]}
              />
              <YAxis yAxisId="p" orientation="right" hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "#e2e8f0",
                }}
                formatter={(v, name) =>
                  name === "prob"
                    ? [`${v}%`, "Вероятность осадков"]
                    : [`${v}°C`, "Температура"]
                }
              />
              <Bar
                yAxisId="p"
                dataKey="prob"
                fill="#38bdf8"
                fillOpacity={0.35}
                radius={[3, 3, 0, 0]}
              />
              <Area
                yAxisId="t"
                type="monotone"
                dataKey="temp"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fill="url(#tempFill)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {data.hourly.map((h, i) => {
            const info = weatherInfo(h.code, h.isDay);
            return (
              <div
                key={h.time}
                className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl border border-white/5 bg-white/[0.03] px-2 py-2 text-center"
              >
                <span className="text-xs text-slate-400">
                  {i === 0 ? "Сейчас" : isoClock(h.time)}
                </span>
                <span className="text-xl" title={info.label} aria-hidden>
                  {info.icon}
                </span>
                <span className="text-sm font-semibold text-white">
                  {signed(h.temp)}°
                </span>
                <span className="text-[11px] text-sky-300">
                  {h.precipProb ? `${h.precipProb}%` : "\u00A0"}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Прогноз на 7 дней">
        <DailyList data={data} />
      </Card>
    </>
  );
}

function DailyList({ data }: { data: WeatherData }) {
  const min = Math.min(...data.daily.map((d) => d.tMin));
  const max = Math.max(...data.daily.map((d) => d.tMax));
  const span = Math.max(1, max - min);

  return (
    <ul className="divide-y divide-white/5">
      {data.daily.map((d, i) => {
        const info = weatherInfo(d.code, true);
        const left = ((d.tMin - min) / span) * 100;
        const width = Math.max(6, ((d.tMax - d.tMin) / span) * 100);
        return (
          <li
            key={d.date}
            className="grid grid-cols-[64px_1fr_auto] items-center gap-3 py-2.5 sm:grid-cols-[88px_1.2fr_64px_1fr_auto]"
          >
            <div>
              <div className="text-sm font-medium text-white">
                {i === 0 ? "Сегодня" : fmtIsoWeekday(d.date)}
              </div>
              <div className="text-xs text-slate-400">{fmtIsoDay(d.date)}</div>
            </div>
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-2xl" aria-hidden>
                {info.icon}
              </span>
              <span className="hidden truncate text-sm text-slate-300 sm:inline">
                {info.label}
              </span>
            </div>
            <div className="hidden text-right text-xs text-slate-400 sm:block">
              {d.precipProbMax ? (
                <span className="text-sky-300">💧 {d.precipProbMax}%</span>
              ) : (
                "—"
              )}
              {d.precipSum > 0 && <div>{round(d.precipSum, 1)} мм</div>}
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="w-8 text-right text-sm text-slate-400">
                {signed(d.tMin)}°
              </span>
              <div className="relative h-1.5 flex-1 rounded-full bg-white/10">
                <div
                  className="absolute h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-400"
                  style={{ left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                />
              </div>
              <span className="w-8 text-sm font-semibold text-white">
                {signed(d.tMax)}°
              </span>
            </div>
            <div className="text-right text-sm sm:hidden">
              <span className="font-semibold text-white">{signed(d.tMax)}°</span>
              <span className="text-slate-400"> / {signed(d.tMin)}°</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
