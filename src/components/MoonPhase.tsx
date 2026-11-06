import { moonPath } from "@/lib/astro";

export function MoonPhase({
  phase,
  southern = false,
  size = 140,
}: {
  phase: number;
  southern?: boolean;
  size?: number;
}) {
  const { d, mirror } = moonPath(phase);
  const flip = mirror !== southern;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="Фаза Луны"
    >
      <defs>
        <radialGradient id="moonLit" cx="40%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#fffbea" />
          <stop offset="100%" stopColor="#d9d3b8" />
        </radialGradient>
        <filter id="moonGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      <circle cx="60" cy="60" r="52" fill="#fde68a" opacity="0.08" filter="url(#moonGlow)" />
      <circle cx="60" cy="60" r="50" fill="#1e293b" stroke="#334155" strokeWidth="1" />
      <g transform={flip ? "translate(120,0) scale(-1,1)" : undefined}>
        <path d={d} fill="url(#moonLit)" />
      </g>
    </svg>
  );
}
