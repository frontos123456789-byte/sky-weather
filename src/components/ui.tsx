import type { ReactNode } from "react";

export function Section({
  id,
  title,
  subtitle,
  icon,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            <span aria-hidden>{icon}</span>
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

export function Card({
  title,
  right,
  children,
  className = "",
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-lg shadow-black/20 backdrop-blur sm:p-5 ${className}`}
    >
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && (
            <h3 className="text-sm font-medium uppercase tracking-wider text-slate-400">
              {title}
            </h3>
          )}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        {icon && <span aria-hidden>{icon}</span>}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-white/5 ${className}`}
      aria-hidden
    />
  );
}

export function LoadingCards({ heights }: { heights: string[] }) {
  return (
    <div className="grid gap-4" role="status" aria-label="Загрузка">
      {heights.map((h, i) => (
        <Skeleton key={i} className={h} />
      ))}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  title = "Данные недоступны",
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/5 p-8 text-center"
    >
      <div className="text-3xl" aria-hidden>
        📡
      </div>
      <div className="font-medium text-rose-100">{title}</div>
      <p className="max-w-md text-sm text-slate-400">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
        >
          Повторить
        </button>
      )}
    </div>
  );
}

export function Badge({
  color,
  children,
}: {
  color: string;
  children: ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ color, backgroundColor: `${color}22`, border: `1px solid ${color}55` }}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  color = "#38bdf8",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: color }}
      />
    </div>
  );
}
