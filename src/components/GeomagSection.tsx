"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GeomagData, KpPoint } from "@/lib/types";
import {
  kpColor,
  kpLabel,
  kpLevel,
  kpToG,
  LEVEL_ADVICE,
  LEVEL_COLOR,
  LEVEL_LABEL,
  type KpLevel,
} from "@/lib/kp";
import { fmtDateTime, fmtIsoDay, fmtIsoWeekday, fmtTime, fmtDayMonth } from "@/lib/format";
import { Badge, Card, ErrorState, LoadingCards } from "./ui";

type Props = {
  data: GeomagData | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  offsetSec: number;
};

const LEVELS: KpLevel[] = ["calm", "weak", "moderate", "strong"];

export function GeomagSection({ data, loading, error, onRetry, offsetSec }: Props) {
  if (loading && !data) return <LoadingCards heights={["h-56", "h-64", "h-64"]} />;
  if (!data) {
    return (
      <ErrorState
        title="Не удалось загрузить геомагнитные данные"
        message={error ?? "NOAA SWPC недоступен."}
        onRetry={onRetry}
      />
    );
  }

  const kp = data.kpNow;
  const level = kpLevel(kp);
  const color = kpColor(kp);
  const g = kpToG(kp);
  const advice = LEVEL_ADVICE[level];

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card title="Kp-индекс сейчас">
          <div className="flex items-center gap-5">
            <KpGauge kp={kp} color={color} />
            <div>
              <div className="text-xl font-semibold" style={{ color }}>
                {kpLabel(kp)}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge color={color}>G{g}</Badge>
                <span className="text-xs text-slate-400">
                  шкала NOAA, обновлено {fmtTime(data.kpNowTime, offsetSec)}
                </span>
              </div>
              {data.stormProbabilityToday != null && (
                <div className="mt-3 text-sm text-slate-300">
                  Вероятность бури сегодня:{" "}
                  <span className="font-semibold text-white">
                    {data.stormProbabilityToday}%
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-1.5">
            {LEVELS.map((l) => (
              <div
                key={l}
                className={`rounded-lg border px-1.5 py-1.5 text-center text-[11px] leading-tight transition ${
                  l === level ? "border-white/40 text-white" : "border-white/5 text-slate-500"
                }`}
                style={{
                  backgroundColor: l === level ? `${LEVEL_COLOR[l]}33` : "transparent",
                }}
              >
                <span
                  className="mx-auto mb-1 block h-1.5 w-6 rounded-full"
                  style={{ backgroundColor: LEVEL_COLOR[l] }}
                />
                {LEVEL_LABEL[l]}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Что это значит">
          <div className="space-y-3 text-sm leading-relaxed text-slate-300">
            <p>
              <span className="mr-1.5" aria-hidden>
                🫀
              </span>
              <b className="text-white">Самочувствие.</b> {advice.health}
            </p>
            <p>
              <span className="mr-1.5" aria-hidden>
                📡
              </span>
              <b className="text-white">Связь и навигация.</b> {advice.comms}
            </p>
            <p>
              <span className="mr-1.5" aria-hidden>
                🌌
              </span>
              <b className="text-white">Полярные сияния.</b> {advice.aurora}
            </p>
          </div>
        </Card>
      </div>

      <Card title="Kp-индекс за последние 24 часа">
        <KpChart points={data.history} offsetSec={offsetSec} showDate={false} />
        <Legend />
      </Card>

      <Card title="Прогноз Kp на 3 дня">
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          {data.days.map((d, i) => {
            const lvl = kpLevel(d.maxKp);
            const col = LEVEL_COLOR[lvl];
            return (
              <div
                key={d.date}
                className="rounded-xl border border-white/5 bg-white/[0.03] p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-white">
                    {i === 0 ? "Сегодня" : fmtIsoWeekday(d.date)}{" "}
                    <span className="text-slate-400">{fmtIsoDay(d.date)}</span>
                  </div>
                  <Badge color={col}>G{d.gScale}</Badge>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold" style={{ color: col }}>
                    {d.maxKp.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400">макс. Kp</span>
                </div>
                <div className="mt-1 text-sm" style={{ color: col }}>
                  {kpLabel(d.maxKp)}
                </div>
                {d.stormProbability != null && (
                  <div className="mt-1 text-xs text-slate-400">
                    Вероятность бури: {d.stormProbability}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <KpChart points={data.forecast} offsetSec={offsetSec} showDate />
        <p className="mt-2 text-xs text-slate-500">
          Время указано для выбранного города. Данные: NOAA SWPC. Светлые столбцы — прогноз.
        </p>
      </Card>
    </>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
      {LEVELS.map((l) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: LEVEL_COLOR[l] }} />
          {LEVEL_LABEL[l]}
        </span>
      ))}
    </div>
  );
}

function KpChart({
  points,
  offsetSec,
  showDate,
}: {
  points: KpPoint[];
  offsetSec: number;
  showDate: boolean;
}) {
  if (points.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Нет данных для графика.</p>;
  }
  const data = points.map((p) => ({
    t: p.t,
    kp: Math.round(p.kp * 100) / 100,
    type: p.type,
    label: showDate
      ? `${fmtDayMonth(p.t, offsetSec)} ${fmtTime(p.t, offsetSec)}`
      : fmtTime(p.t, offsetSec),
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={showDate ? 3 : 0}
            minTickGap={showDate ? 10 : 4}
          />
          <YAxis
            domain={[0, 9]}
            ticks={[0, 3, 5, 7, 9]}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <ReferenceLine y={5} stroke="#facc15" strokeDasharray="4 4" strokeOpacity={0.6} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{
              background: "#0f172a",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              color: "#e2e8f0",
            }}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as { t: number } | undefined;
              return p ? fmtDateTime(p.t, offsetSec) : "";
            }}
            formatter={(v) => [String(v), "Kp"]}
          />
          <Bar dataKey="kp" radius={[4, 4, 0, 0]}>
            {data.map((d) => (
              <Cell
                key={d.t}
                fill={kpColor(d.kp)}
                fillOpacity={d.type === "predicted" ? 0.45 : 0.95}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpGauge({ kp, color }: { kp: number; color: string }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const arc = C * 0.75; // 270° gauge
  const frac = Math.min(1, kp / 9);
  return (
    <svg width="130" height="130" viewBox="0 0 120 120" role="img" aria-label={`Kp ${kp}`}>
      <g transform="rotate(135 60 60)">
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${C}`}
        />
        <circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${arc * frac} ${C}`}
        />
      </g>
      <text x="60" y="66" textAnchor="middle" fontSize="28" fontWeight="600" fill="#fff">
        {kp.toFixed(1)}
      </text>
      <text x="60" y="84" textAnchor="middle" fontSize="10" fill="#94a3b8">
        Kp из 9
      </text>
    </svg>
  );
}
