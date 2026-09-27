import type { HarvestState } from "@/domain/harvest";
import { cn } from "@/lib/utils";

/**
 * The regrowth cycle as a ruler: regrowing → peak window → bolting,
 * with a pin at today. The scale extends past the bolting line so an
 * overdue plant still has room to sit on the ruler.
 */
export function HarvestCycle({ state, days, cycle }: { state: HarvestState; days: number; cycle: number }) {
  const span = Math.max(state.boltingDay * 1.25, days + 1);
  const pct = (d: number) => `${(Math.min(d, span) / span) * 100}%`;
  const pinTone = { peak: "bg-leaf", bolting: "bg-amber", regrowing: "bg-ink" }[state.status];

  return (
    <div>
      <div className="flex items-baseline justify-between text-[12px]">
        <span className="font-semibold text-ink">
          Day {days}
          <span className="font-normal text-ink-muted"> of {cycle}-day cycle</span>
        </span>
        <span className="font-mono text-[11px] text-ink-muted">
          peak d{Math.ceil(state.peakStartDay)}–{Math.ceil(state.boltingDay) - 1}
        </span>
      </div>
      <div
        className="relative mt-2 h-2 rounded-full bg-paper-deep"
        role="img"
        aria-label={`Day ${days} of ${cycle}. Peak window from day ${Math.ceil(state.peakStartDay)}, bolting risk from day ${Math.ceil(state.boltingDay)}.`}
      >
        <div className="absolute inset-y-0 rounded-full bg-leaf/30" style={{ left: pct(state.peakStartDay), width: `calc(${pct(state.boltingDay)} - ${pct(state.peakStartDay)} - 2px)` }} />
        <div className="absolute inset-y-0 right-0 rounded-r-full bg-amber/35" style={{ left: pct(state.boltingDay) }} />
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-500 ease-out"
          style={{ left: pct(days) }}
        >
          <span className={cn("block size-3.5 rounded-full ring-[3px] ring-card", pinTone)} />
        </div>
      </div>
    </div>
  );
}
