import { memo, type ReactElement } from "react";
import { cn } from "@/lib/utils";

/*
 * Hand-built botanical line drawings. Each herb gets its own leaf geometry so
 * the plants read as themselves at a glance: broad cupped basil, serrated mint,
 * needled rosemary, tiny-leaved thyme. Soil colour tracks live moisture.
 */

type Pt = [number, number];
interface Stem {
  p0: Pt;
  p1: Pt;
  p2: Pt;
}

const STROKE = "var(--color-ink-soft)";

const at = ({ p0, p1, p2 }: Stem, t: number): Pt => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
};

/** Heading in degrees where 0 = straight up, positive = clockwise. */
const heading = ({ p0, p1, p2 }: Stem, t: number) => {
  const dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
  const dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
};

const stemPath = ({ p0, p1, p2 }: Stem) => `M${p0[0]} ${p0[1]} Q${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`;

function leafOutline(len: number, width: number, serrated = false): string {
  const w = width / 2;
  if (!serrated) {
    return `M0 0 C${w * 1.15} ${-len * 0.2} ${w} ${-len * 0.78} 0 ${-len} C${-w} ${-len * 0.78} ${-w * 1.15} ${-len * 0.2} 0 0Z`;
  }
  // Sample the same cubic and notch every other point for a toothed mint edge.
  const steps = 14;
  const right: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = 3 * u * u * t * (w * 1.15) + 3 * u * t * t * w;
    const y = 3 * u * u * t * (-len * 0.2) + 3 * u * t * t * (-len * 0.78) + t * t * t * -len;
    right.push([i % 2 === 1 && i < steps ? x * 1.14 : x, y]);
  }
  const left = right.slice().reverse().map(([x, y]) => [-x, y] as Pt);
  return `M${[...right, ...left].map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L")}Z`;
}

function Leaf({
  x,
  y,
  angle,
  len,
  width,
  fill,
  serrated,
  rib = true,
}: {
  x: number;
  y: number;
  angle: number;
  len: number;
  width: number;
  fill: string;
  serrated?: boolean;
  rib?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d={leafOutline(len, width, serrated)} fill={fill} stroke={STROKE} strokeWidth={1.1} strokeLinejoin="round" />
      {rib && <path d={`M0 -1 L0 ${-len * 0.82}`} stroke={STROKE} strokeWidth={0.7} opacity={0.55} strokeLinecap="round" />}
    </g>
  );
}

function Basil() {
  const fill = "#cbe7d2";
  const stem: Stem = { p0: [80, 150], p1: [81, 100], p2: [80, 44] };
  const shoots: Stem[] = [
    { p0: [80, 128], p1: [64, 112], p2: [50, 88] },
    { p0: [80, 120], p1: [98, 104], p2: [110, 82] },
  ];
  const pairs = [
    { t: 0.24, len: 38, width: 28, spread: 66 },
    { t: 0.46, len: 32, width: 24, spread: 56 },
    { t: 0.64, len: 26, width: 19, spread: 46 },
    { t: 0.8, len: 19, width: 14, spread: 34 },
  ];
  return (
    <g>
      {shoots.map((shoot, i) => {
        const [x, y] = at(shoot, 0.62);
        const h = heading(shoot, 0.62);
        return (
          <g key={i}>
            <path d={stemPath(shoot)} stroke={STROKE} strokeWidth={1.6} fill="none" strokeLinecap="round" />
            <Leaf x={x} y={y} angle={h - 58} len={24} width={18} fill={fill} />
            <Leaf x={x} y={y} angle={h + 58} len={24} width={18} fill={fill} />
            <Leaf x={shoot.p2[0]} y={shoot.p2[1]} angle={h - 14} len={16} width={12} fill={fill} />
            <Leaf x={shoot.p2[0]} y={shoot.p2[1]} angle={h + 20} len={14} width={11} fill={fill} />
          </g>
        );
      })}
      <path d={stemPath(stem)} stroke={STROKE} strokeWidth={2} fill="none" strokeLinecap="round" />
      {pairs.map(({ t, len, width, spread }) => {
        const [x, y] = at(stem, t);
        return (
          <g key={t}>
            <Leaf x={x} y={y} angle={-spread} len={len} width={width} fill={fill} />
            <Leaf x={x} y={y} angle={spread} len={len} width={width} fill={fill} />
          </g>
        );
      })}
      <Leaf x={80} y={46} angle={-20} len={14} width={11} fill={fill} />
      <Leaf x={80} y={46} angle={20} len={14} width={11} fill={fill} />
      <Leaf x={80} y={45} angle={0} len={12} width={9} fill={fill} rib={false} />
    </g>
  );
}

function Mint() {
  const fill = "#bfe0cc";
  const stems: Stem[] = [
    { p0: [80, 150], p1: [80, 100], p2: [79, 42] },
    { p0: [74, 150], p1: [66, 118], p2: [54, 76] },
    { p0: [87, 150], p1: [96, 122], p2: [108, 86] },
  ];
  const nodes = [
    [0.3, 0.52, 0.72, 0.9],
    [0.45, 0.72, 0.94],
    [0.45, 0.72, 0.94],
  ];
  return (
    <g>
      {stems.map((stem, i) => (
        <g key={i}>
          <path d={stemPath(stem)} stroke={STROKE} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          {nodes[i]!.map((t, j) => {
            const [x, y] = at(stem, t);
            const h = heading(stem, t);
            const scale = 1 - t * 0.45;
            const len = (i === 0 ? 30 : 24) * scale;
            return (
              <g key={j}>
                <Leaf x={x} y={y} angle={h - 72} len={len} width={len * 0.52} fill={fill} serrated />
                <Leaf x={x} y={y} angle={h + 72} len={len} width={len * 0.52} fill={fill} serrated />
              </g>
            );
          })}
          <Leaf x={stem.p2[0]} y={stem.p2[1]} angle={heading(stem, 1)} len={10} width={6} fill={fill} rib={false} />
        </g>
      ))}
    </g>
  );
}

function Rosemary() {
  const fill = "#c4d6cd";
  const stems: Stem[] = [
    { p0: [80, 150], p1: [79, 100], p2: [84, 34] },
    { p0: [75, 150], p1: [62, 110], p2: [50, 56] },
    { p0: [85, 150], p1: [100, 112], p2: [112, 62] },
  ];
  const needles: ReactElement[] = [];
  stems.forEach((stem, i) => {
    for (let t = 0.12; t <= 0.98; t += 0.055) {
      const [x, y] = at(stem, t);
      const h = heading(stem, t);
      const len = 13 - t * 5;
      needles.push(
        <Leaf key={`${i}-${t}-l`} x={x} y={y} angle={h - 38} len={len} width={3} fill={fill} rib={false} />,
        <Leaf key={`${i}-${t}-r`} x={x} y={y} angle={h + 38} len={len} width={3} fill={fill} rib={false} />,
      );
    }
  });
  return (
    <g>
      {stems.map((stem, i) => (
        <path key={i} d={stemPath(stem)} stroke="#6b5a45" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      ))}
      {needles}
    </g>
  );
}

function Thyme() {
  const fill = "#d0ddc6";
  const stems: Stem[] = [
    { p0: [80, 150], p1: [80, 118], p2: [80, 72] },
    { p0: [77, 150], p1: [64, 124], p2: [44, 96] },
    { p0: [83, 150], p1: [98, 124], p2: [118, 98] },
    { p0: [78, 150], p1: [70, 116], p2: [60, 78] },
    { p0: [82, 150], p1: [92, 114], p2: [102, 76] },
    { p0: [76, 150], p1: [58, 136], p2: [36, 124] },
    { p0: [84, 150], p1: [104, 138], p2: [126, 128] },
  ];
  return (
    <g>
      {stems.map((stem, i) => (
        <g key={i}>
          <path d={stemPath(stem)} stroke="#6b5a45" strokeWidth={1.2} fill="none" strokeLinecap="round" />
          {[0.3, 0.44, 0.58, 0.72, 0.86, 0.98].map((t) => {
            const [x, y] = at(stem, t);
            const h = heading(stem, t);
            return (
              <g key={t}>
                <Leaf x={x} y={y} angle={h - 55} len={7} width={5} fill={fill} rib={false} />
                <Leaf x={x} y={y} angle={h + 55} len={7} width={5} fill={fill} rib={false} />
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

const PLANTS: Record<string, () => ReactElement> = { basil: Basil, mint: Mint, rosemary: Rosemary, thyme: Thyme };

/** Stem tips where flower spikes appear when a herb bolts. */
const TIPS: Record<string, Pt[]> = {
  basil: [[80, 44], [50, 88], [110, 82]],
  mint: [[79, 42], [54, 76], [108, 86]],
  rosemary: [[84, 34], [50, 56], [112, 62]],
  thyme: [[80, 72], [44, 96], [118, 98], [60, 78], [102, 76]],
};

function Flowers({ tips }: { tips: Pt[] }) {
  return (
    <g className="animate-fade">
      {tips.map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          {[
            [0, -9],
            [-3.5, -4.5],
            [3.5, -4.5],
            [0, -1],
          ].map(([dx, dy]) => (
            <circle key={`${dx}${dy}`} cx={dx} cy={dy} r={2.8} fill="#ecdff2" stroke={STROKE} strokeWidth={0.8} />
          ))}
        </g>
      ))}
    </g>
  );
}

/** Dry soil is sandy tan; saturated soil is dark loam. */
function soilColor(moisture: number) {
  const t = Math.max(0, Math.min(1, moisture / 70));
  const dry = [205, 184, 153];
  const wet = [79, 59, 45];
  const mix = dry.map((d, i) => Math.round(d + (wet[i]! - d) * t));
  return `rgb(${mix.join(" ")})`;
}

interface HerbIllustrationProps {
  herbId: string;
  moisture: number | null;
  watering?: boolean;
  /** Canopy size, 0 = just cut, 1 = full. */
  growth?: number;
  /** Show flower spikes. */
  bolting?: boolean;
  className?: string;
}

export const HerbIllustration = memo(function HerbIllustration({
  herbId,
  moisture,
  watering = false,
  growth = 1,
  bolting = false,
  className,
}: HerbIllustrationProps) {
  const scale = 0.42 + 0.58 * Math.max(0, Math.min(1, growth));
  const Plant = PLANTS[herbId] ?? Basil;
  const soil = soilColor(moisture ?? 30);
  return (
    <svg viewBox="14 26 132 174" className={cn("overflow-visible", className)} aria-hidden>
      <ellipse cx={80} cy={153} rx={38} ry={6} fill={soil} style={{ transition: "fill 600ms ease" }} />
      <g
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "80px 152px",
          transition: "transform 900ms var(--ease-out-quart)",
        }}
      >
        <Plant />
        {bolting && <Flowers tips={TIPS[herbId] ?? []} />}
      </g>
      {watering &&
        [66, 80, 94].map((x, i) => (
          <path
            key={x}
            d={`M${x} 124 q-3 5 0 7 q3 -2 0 -7Z`}
            fill="var(--color-water)"
            className="animate-fall"
            style={{ animationDelay: `${i * 0.33}s`, transformBox: "fill-box" }}
          />
        ))}
      {/* Pot */}
      <path d="M46 162 L52 194 Q53 197 56 197 L104 197 Q107 197 108 194 L114 162Z" fill="var(--color-clay)" stroke={STROKE} strokeWidth={1.2} />
      <path d="M57 168 L61 190" stroke="#fff" strokeOpacity={0.22} strokeWidth={4} strokeLinecap="round" />
      <rect x={38} y={153} width={84} height={11} rx={3} fill="#b9734f" stroke={STROKE} strokeWidth={1.2} />
    </svg>
  );
});
