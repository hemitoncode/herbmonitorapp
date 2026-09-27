import { cn } from "@/lib/utils";

export type GaugeTone = "leaf" | "amber" | "water" | "offline";

const SWEEP = 240;
const START = -SWEEP / 2;
const SIZE = 280;
const C = SIZE / 2;
const R = 106;
/** The 240° sweep leaves the bottom of the square empty; crop it. */
const VIEW_H = 236;

const toneStroke: Record<GaugeTone, string> = {
  leaf: "var(--color-leaf)",
  amber: "var(--color-amber)",
  water: "var(--color-water)",
  offline: "var(--color-offline)",
};

/** Degrees clockwise from 12 o'clock for a 0–100 value. */
const angleFor = (pct: number) => START + (SWEEP * Math.max(0, Math.min(100, pct))) / 100;

function polar(angle: number, radius: number): [number, number] {
  const rad = (angle * Math.PI) / 180;
  return [C + radius * Math.sin(rad), C - radius * Math.cos(rad)];
}

function arc(fromPct: number, toPct: number, radius: number) {
  const a1 = angleFor(fromPct);
  const a2 = angleFor(toPct);
  const [x1, y1] = polar(a1, radius);
  const [x2, y2] = polar(a2, radius);
  return `M${x1} ${y1} A${radius} ${radius} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

interface MoistureGaugeProps {
  value: number | null;
  threshold: number;
  optimalMin: number;
  optimalMax: number;
  tone: GaugeTone;
  className?: string;
}

export function MoistureGauge({ value, threshold, optimalMin, optimalMax, tone, className }: MoistureGaugeProps) {
  const v = value ?? 0;
  const [tx1, ty1] = polar(angleFor(threshold), R - 16);
  const [tx2, ty2] = polar(angleFor(threshold), R + 16);
  const [lx, ly] = polar(angleFor(threshold), R + 36);
  const [zx, zy] = polar(START, R + 2);
  const [hx, hy] = polar(-START, R + 2);

  return (
    <div
      className={cn("relative mx-auto aspect-[280/236] w-full max-w-[320px]", className)}
      role="meter"
      aria-label="Soil moisture"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      aria-valuetext={value === null ? "No reading" : `${v.toFixed(1)} percent, threshold ${threshold} percent`}
    >
      <svg viewBox={`0 0 ${SIZE} ${VIEW_H}`} className="size-full overflow-visible">
        {/* Optimal band, outside the track */}
        <path
          d={arc(optimalMin, optimalMax, R + 13)}
          stroke="var(--color-leaf)"
          strokeOpacity={0.45}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
        {/* Track */}
        <path d={arc(0, 100, R)} stroke="var(--color-paper-deep)" strokeWidth={16} fill="none" strokeLinecap="round" />
        {/* Value */}
        {value !== null && (
          <path
            d={arc(0, 100, R)}
            pathLength={100}
            stroke={toneStroke[tone]}
            strokeWidth={16}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${Math.max(0.01, v)} 200`}
            style={{
              transition: "stroke-dasharray 320ms var(--ease-out-quart), stroke 400ms ease",
            }}
          />
        )}
        {/* End marker with a surface ring */}
        {value !== null && (
          <g
            style={{
              transform: `rotate(${angleFor(v)}deg)`,
              transformOrigin: `${C}px ${C}px`,
              transition: "transform 320ms var(--ease-out-quart)",
            }}
          >
            <circle cx={C} cy={C - R} r={6.5} fill="var(--color-card)" stroke={toneStroke[tone]} strokeWidth={3} />
          </g>
        )}
        {/* Threshold reference */}
        <line
          x1={tx1}
          y1={ty1}
          x2={tx2}
          y2={ty2}
          stroke="var(--color-ink)"
          strokeWidth={2}
          strokeLinecap="round"
          style={{ transition: "all 200ms ease" }}
        />
        <text
          x={lx}
          y={ly}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-ink font-mono text-[11px] font-semibold"
        >
          {Math.round(threshold)}%
        </text>
        <text x={zx - 4} y={zy + 22} textAnchor="middle" className="fill-ink-muted font-mono text-[10px]">
          0
        </text>
        <text x={hx + 4} y={hy + 22} textAnchor="middle" className="fill-ink-muted font-mono text-[10px]">
          100
        </text>
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-6">
        <span className="eyebrow">Soil moisture</span>
        <span className="mt-1 flex items-baseline font-sans leading-none font-semibold tracking-[-0.03em] text-ink">
          {value === null ? (
            <span className="text-[30px] text-ink-muted">No signal</span>
          ) : (
            <>
              <span className="text-[64px]">{v.toFixed(1)}</span>
              <span className="ml-0.5 text-[26px] text-ink-muted">%</span>
            </>
          )}
        </span>
        <span className="mt-2 text-[12px] text-ink-muted">
          Optimal {optimalMin}–{optimalMax}%
        </span>
      </div>
    </div>
  );
}
