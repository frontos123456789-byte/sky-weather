"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GeomagData, SunData } from "@/lib/types";
import { fmtDateTime, fmtIsoDay } from "@/lib/format";
import { Badge, Card, ErrorState, LoadingCards, ProgressBar, Stat } from "./ui";

type Props = {
  data: SunData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  geomag: GeomagData | null;
  offsetSec: number;
};

const tooltipStyle = {
  background: "#0f172a",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  color: "#e2e8f0",
};

const LEVEL_TICKS = [1, 2, 3, 4, 5];
const LEVEL_LETTER: Record<number, string> = { 1: "A", 2: "B", 3: "C", 4: "M", 5: "X" };

function flareColor(cls: string): string {
  return cls.startsWith("X") ? "#f43f5e" : cls.startsWith("M") ? "#fb923c" : "#facc15";
}

export function SunSection({ data, loading, error, onRetry, geomag, offsetSec }: Props) {
  if (loading && !data) return <LoadingCards heights={["h-48", "h-72", "h-64"]} />;
  if (!data) {
    return (
      <ErrorState
        title="Не удалось загрузить данные о Солнце"
        message={error ?? "NOAA SWPC недоступен."}
        onRetry={onRetry}
      />
    );
  }

  const mProb = data.probabilities?.m[0];
  const xProb = data.probabilities?.x[0];
  const storm = geomag?.stormProbabilityToday ?? null;
  const rScale = data.radioBlackoutScale;
  const c = data.cycle;

  return (
    <>
      <Card title="Солнечная активность сейчас">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat
            icon="⚫"
            label="Число солнечных пятен"
            value={data.sunspotNumber ?? "—"}
            hint={
              data.sunspotCount != null
                ? `${data.sunspotCount} пятен в ${data.sunspotGroups} группах`
                : undefined
            }
          />
          <Stat
            icon="🔆"
            label="Поток F10.7"
            value={data.f107 != null ? `${data.f107} sfu` : "—"}
            hint="радиоизлучение Солнца"
          />
          <Stat
            icon="💥"
            label="Вспышки за 7 суток"
            value={
              <span className="text-base">
                <span className="text-yellow-300">C {data.flareCounts.c}</span>{" "}
                <span className="text-orange-400">M {data.flareCounts.m}</span>{" "}
                <span className="text-rose-400">X {data.flareCounts.x}</span>
              </span>
            }
            hint={data.strongestFlare ? `сильнейшая: ${data.strongestFlare}` : "вспышек не было"}
          />
          <Stat
            icon="🧲"
            label="Вероятность геобури"
            value={storm != null ? `${storm}%` : "—"}
            hint="сегодня, G1 и выше"
          />
          <Stat
            icon="🟠"
            label="Вспышка класса M, 24 ч"
            value={mProb != null ? `${mProb}%` : "—"}
            hint="прогноз NOAA"
          />
          <Stat
            icon="🔴"
            label="Вспышка класса X, 24 ч"
            value={xProb != null ? `${xProb}%` : "—"}
            hint="прогноз NOAA"
          />
          <Stat
            icon="📻"
            label="Радиоблэкаут"
            value={rScale != null ? `R${rScale}` : "—"}
            hint={rScale === 0 ? "нет помех" : "шкала NOAA (R0–R5)"}
          />
          <Stat
            icon="📅"
            label="Данные о пятнах"
            value={data.regionsDate ? fmtIsoDay(data.regionsDate) : "—"}
            hint="последний отчёт"
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="Активность за последние дни">
          {data.activity.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Нет данных для графика.</p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={data.activity.map((a) => ({
                    label: fmtIsoDay(a.date),
                    wolf: a.wolf,
                    level: a.flareLevel,
                    cls: a.flareClass,
                  }))}
                  margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={12}
                  />
                  <YAxis
                    yAxisId="w"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="f"
                    orientation="right"
                    domain={[1, 5]}
                    ticks={LEVEL_TICKS}
                    tickFormatter={(v) => LEVEL_LETTER[v as number] ?? ""}
                    tick={{ fill: "#fb923c", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={26}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    formatter={(v, name, item) =>
                      name === "level"
                        ? [(item?.payload as { cls?: string })?.cls ?? "—", "Пик вспышки"]
                        : [String(v), "Число Вольфа (оценка)"]
                    }
                  />
                  <Bar yAxisId="w" dataKey="wolf" fill="#f59e0b" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="f"
                    type="monotone"
                    dataKey="level"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#f43f5e" }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-amber-500" /> Число пятен (10·группы + пятна)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3 bg-rose-500" /> Пик рентгеновской вспышки за сутки (A–X)
            </span>
          </div>
        </Card>

        <Card title="Сильные вспышки (M/X)">
          {data.flares.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              За последние 7 суток вспышек классов M и X не зарегистрировано.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {data.flares.map((f) => (
                <li key={f.time} className="flex items-center justify-between py-2">
                  <span className="text-sm text-slate-300">{fmtDateTime(f.time, offsetSec)}</span>
                  <Badge color={flareColor(f.cls)}>{f.cls}</Badge>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Время — по выбранному городу. Источник: GOES/NOAA SWPC.
          </p>
        </Card>
      </div>

      {c && (
        <Card
          title={`Солнечный цикл ${c.number}`}
          right={<Badge color="#fbbf24">{c.phaseLabel}</Badge>}
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-300">{c.description}</p>
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-400">
                  <span>Начало ({c.startMonth})</span>
                  <span>≈ {c.progressPct}% из ~11 лет</span>
                </div>
                <ProgressBar value={c.progressPct} color="#fbbf24" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Сейчас" value={c.currentSsn} hint={`SSN, ${c.currentMonth}`} />
                <Stat
                  label="Пик"
                  value={Math.round(c.peakSsn)}
                  hint={`сглаж. SSN, ${c.peakMonth}`}
                />
                <Stat
                  label="Прогноз"
                  value={c.predictedSsn ?? "—"}
                  hint="на след. месяц"
                />
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={c.series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cycleFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="t"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => v.slice(0, 4)}
                    minTickGap={30}
                  />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v, name) => [
                      String(v),
                      name === "predicted" ? "Прогноз SSN" : "SSN (наблюдения)",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="ssn"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    fill="url(#cycleFill)"
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
