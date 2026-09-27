import { Check, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { GardenState } from "@/store/gardenStore";
import { gardenStore } from "@/store/runtime";

/**
 * The spec's §6 walkthrough as a checklist that ticks itself as the state
 * machine passes through each transition, so a first-time user learns
 * cause → effect by doing rather than reading.
 */
const STEPS = [
  {
    title: "Pull the soil below the line",
    hint: "Drag Set soil moisture under the pot's threshold. The kitchen card and banner turn amber.",
  },
  {
    title: "Start watering",
    hint: "Press Start Watering (Telemetry) or Water now (Kitchen). Litres count up at 0.5 L/min.",
  },
  {
    title: "Watch it cross the line",
    hint: "Moisture climbs 1.2%/s. The advice flips back to green as it passes the threshold.",
  },
  {
    title: "Stop the valve",
    hint: "Press Stop, or let the 60 s watchdog close it. Session litres move into lifetime.",
  },
  {
    title: "Log the harvest",
    hint: "Press Log Harvest on a ready card. Its clock resets to day 0 and it starts regrowing.",
  },
] as const;

type Done = boolean[];
const NONE: Done = STEPS.map(() => false);

function useDemoProgress() {
  const [done, setDone] = useState<Done>(NONE);
  useEffect(() => {
    return gardenStore.subscribe((s: GardenState, prev: GardenState) => {
      const next = [...NONE];
      let changed = false;
      for (const id of s.order) {
        const a = s.runtime[id]!;
        const b = prev.runtime[id]!;
        if (b.needsWater === false && a.needsWater === true) next[0] = true;
        if (b.valve.state === "CLOSED" && a.valve.state === "OPEN") next[1] = true;
        if (a.valve.state === "OPEN" && b.needsWater === true && a.needsWater === false) next[2] = true;
        if (b.valve.state === "OPEN" && a.valve.state === "CLOSED") next[3] = true;
      }
      if (s.totalHarvests > prev.totalHarvests) next[4] = true;
      if (next.some(Boolean)) changed = true;
      if (changed) setDone((d) => d.map((v, i) => v || next[i]!));
    });
  }, []);
  return [done, () => setDone(NONE)] as const;
}

export function DemoWalkthrough() {
  const [done, reset] = useDemoProgress();
  const current = done.findIndex((d) => !d);
  const finished = current === -1;

  return (
    <section aria-labelledby="demo-title" className="border-b border-bench-rule py-4">
      <div className="mb-3 flex items-baseline gap-3">
        <h2
          id="demo-title"
          className="font-sans text-[11px] font-semibold tracking-[0.14em] text-bench-muted uppercase"
        >
          Try the demo
        </h2>
        <span className="text-[12px] text-bench-muted">
          {finished ? "All five steps done. That's the whole loop." : `Step ${current + 1} of ${STEPS.length}`}
        </span>
        {done.some(Boolean) && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto inline-flex items-center gap-1 text-[11px] text-bench-muted transition-colors hover:text-bench-text"
          >
            <RotateCcw className="size-3" aria-hidden />
            Reset
          </button>
        )}
      </div>
      <ol className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-5">
        {STEPS.map((step, i) => {
          const isDone = done[i];
          const isCurrent = i === current;
          return (
            <li
              key={step.title}
              className={cn("flex gap-2.5", !isDone && !isCurrent && "opacity-55")}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={cn(
                  "mt-px grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-semibold transition-colors duration-300",
                  isDone
                    ? "bg-leaf text-white"
                    : isCurrent
                      ? "bg-bench-text text-bench"
                      : "bg-bench-raised text-bench-muted ring-1 ring-bench-rule",
                )}
              >
                {isDone ? <Check className="size-3" aria-hidden /> : i + 1}
              </span>
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-[12.5px] leading-tight font-semibold",
                    isDone && "line-through decoration-bench-muted",
                  )}
                >
                  {step.title}
                </span>
                <span className="block text-[11px] leading-snug text-bench-muted">{step.hint}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
