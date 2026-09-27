import { Activity, ChefHat } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { StatusDot } from "@/components/ui/badge";
import { useNow } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import type { View } from "@/store/gardenStore";
import { actions, useGarden } from "@/store/runtime";

const VIEWS: { id: View; label: string; icon: typeof ChefHat }[] = [
  { id: "kitchen", label: "Kitchen", icon: ChefHat },
  { id: "telemetry", label: "Telemetry", icon: Activity },
];

export function AppHeader() {
  const view = useGarden((s) => s.view);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent, i: number) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowRight" ? 1 : -1) + VIEWS.length) % VIEWS.length;
    actions().setView(VIEWS[next]!.id);
    tabs.current[next]?.focus();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-rule/80 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-4 px-4 sm:px-8">
        <a href="/" className="flex items-center gap-2.5" aria-label="Sprig home">
          <Logo />
          <span className="font-display text-[26px] leading-none font-semibold tracking-[-0.03em]">Sprig</span>
        </a>

        <div role="tablist" aria-label="View" className="relative ml-auto flex rounded-full bg-paper-deep/80 p-1 ring-1 ring-rule sm:ml-8 md:mr-auto">
          {VIEWS.map((v, i) => {
            const active = v.id === view;
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                id={`tab-${v.id}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls="view-panel"
                tabIndex={active ? 0 : -1}
                onClick={() => actions().setView(v.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={cn(
                  "relative z-10 inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-colors duration-300",
                  active ? "text-paper" : "text-ink-muted hover:text-ink",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {v.label}
              </button>
            );
          })}
          <span
            aria-hidden
            className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-ink transition-transform duration-300 ease-[var(--ease-out-quart)]"
            style={{ transform: view === "telemetry" ? "translateX(100%)" : "none" }}
          />
        </div>

        <BrokerPill />
      </div>
    </header>
  );
}

/** Live broker throughput, sampled once a second. */
function BrokerPill() {
  const count = useGarden((s) => s.messageCount);
  const now = useNow(1000);
  const sample = useRef({ at: now, count, rate: 0 });
  if (now !== sample.current.at) {
    const dt = (now - sample.current.at) / 1000;
    sample.current = { at: now, count, rate: Math.round((count - sample.current.count) / dt) };
  }
  return (
    <div className="hidden items-center gap-2 rounded-full border border-rule bg-card/70 py-1.5 pr-3 pl-2.5 md:flex" title="In-memory MQTT event bus">
      <StatusDot tone="leaf" pulse />
      <span className="font-mono text-[11px] text-ink-soft">
        sim-mqtt · <span className="tabular inline-block w-[4ch] text-right text-ink">{sample.current.rate}</span> msg/s
      </span>
    </div>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--color-ink)" />
      <path d="M16 26V11" stroke="var(--color-paper)" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 17c-5 0-7.5-3-7.5-7 4.5 0 7.5 2.5 7.5 7Z" fill="#3fbf87" />
      <path d="M16 13.5c4.5 0 7-2.6 7-6.5-4.2 0-7 2.4-7 6.5Z" fill="#3fbf87" />
    </svg>
  );
}
