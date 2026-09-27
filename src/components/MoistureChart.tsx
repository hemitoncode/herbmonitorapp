import { useState, type PointerEvent } from "react";
import { useElementSize } from "@/lib/hooks";
import { formatClock } from "@/lib/utils";
import { HISTORY_LENGTH, type MoisturePoint } from "@/store/gardenStore";

interface MoistureChartProps {
  history: MoisturePoint[];
  threshold: number;
  optimalMin: number;
  optimalMax: number;
  height?: number;
}

const PAD = { top: 12, right: 44, bottom: 22, left: 30 };
const GRID = [0, 25, 50, 75, 100];

/** Rolling soil-moisture trace, newest reading at the right edge. */
export function MoistureChart({ history, threshold, optimalMin, optimalMax, height = 200 }: MoistureChartProps) {
  const [ref, { width }] = useElementSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;
  const step = plotW / (HISTORY_LENGTH - 1);
  const offset = HISTORY_LENGTH - history.length;
  const x = (i: number) => PAD.left + (offset + i) * step;
  const y = (m: number) => PAD.top + plotH * (1 - m / 100);

  const line = history.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.moisture).toFixed(1)}`).join("");
  const area = history.length > 1 ? `${line}L${x(history.length - 1)} ${y(0)}L${x(0)} ${y(0)}Z` : "";
  const last = history.at(-1);
  const hovered = hover !== null ? history[hover] : undefined;

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!history.length || step <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round((e.clientX - rect.left - PAD.left) / step) - offset;
    setHover(Math.max(0, Math.min(history.length - 1, i)));
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="block touch-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <rect
            x={PAD.left}
            y={y(optimalMax)}
            width={plotW}
            height={y(optimalMin) - y(optimalMax)}
            fill="var(--color-leaf)"
            opacity={0.07}
          />
          {GRID.map((g) => (
            <g key={g}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(g)}
                y2={y(g)}
                stroke="var(--color-rule)"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(g)}
                textAnchor="end"
                dominantBaseline="middle"
                className="tabular fill-ink-muted font-mono text-[10px]"
              >
                {g}
              </text>
            </g>
          ))}
          <line
            x1={PAD.left}
            x2={PAD.left + plotW}
            y1={y(threshold)}
            y2={y(threshold)}
            stroke="var(--color-ink)"
            strokeWidth={1}
          />
          <text
            x={PAD.left + plotW + 6}
            y={y(threshold)}
            dominantBaseline="middle"
            className="fill-ink font-mono text-[10px] font-semibold"
          >
            {Math.round(threshold)}%
          </text>

          {area && <path d={area} fill="var(--color-ink)" opacity={0.05} />}
          {line && (
            <path
              d={line}
              fill="none"
              stroke="var(--color-ink)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {last && hover === null && (
            <circle
              cx={x(history.length - 1)}
              cy={y(last.moisture)}
              r={4.5}
              fill="var(--color-ink)"
              stroke="var(--color-card)"
              strokeWidth={2}
            />
          )}

          {hovered && hover !== null && (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={PAD.top + plotH}
                stroke="var(--color-ink-muted)"
                strokeWidth={1}
              />
              <circle
                cx={x(hover)}
                cy={y(hovered.moisture)}
                r={4.5}
                fill="var(--color-ink)"
                stroke="var(--color-card)"
                strokeWidth={2}
              />
            </g>
          )}

          <text x={PAD.left} y={height - 4} className="fill-ink-muted font-mono text-[10px]">
            −{HISTORY_LENGTH} s
          </text>
          <text x={PAD.left + plotW} y={height - 4} textAnchor="end" className="fill-ink-muted font-mono text-[10px]">
            now
          </text>
        </svg>
      )}

      {hovered && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg bg-ink px-2.5 py-1.5 font-mono text-[11px] text-paper shadow-lg"
          style={{
            left: Math.min(Math.max(x(hover) - 60, 0), width - 128),
            top: Math.max(0, y(hovered.moisture) - 48),
          }}
        >
          <div className="text-[13px] font-semibold">{hovered.moisture.toFixed(1)}%</div>
          <div className="opacity-70">{formatClock(hovered.t)} sim</div>
        </div>
      )}
    </div>
  );
}

/** Tiny trace for node lists. */
export function Sparkline({
  history,
  threshold,
  width = 72,
  height = 22,
}: {
  history: MoisturePoint[];
  threshold: number;
  width?: number;
  height?: number;
}) {
  const points = history.slice(-40);
  const lo = Math.min(threshold, ...points.map((p) => p.moisture)) - 3;
  const hi = Math.max(threshold, ...points.map((p) => p.moisture)) + 3;
  const y = (m: number) => height - ((m - lo) / (hi - lo || 1)) * height;
  const step = width / 39;
  const off = 40 - points.length;
  const d = points
    .map((p, i) => `${i ? "L" : "M"}${((off + i) * step).toFixed(1)} ${y(p.moisture).toFixed(1)}`)
    .join("");
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <line x1={0} x2={width} y1={y(threshold)} y2={y(threshold)} stroke="var(--color-rule-strong)" strokeWidth={1} />
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
