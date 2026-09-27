import { ChevronUp, FastForward, FlaskConical, Radio, WifiOff, Wifi, Zap } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { DemoWalkthrough } from "@/components/DemoWalkthrough";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { SIM_SPEEDS, type SimSpeed } from "@/engine/engine";
import type { LinkMode } from "@/engine/virtualNode";
import { cn } from "@/lib/utils";
import { actions, useGarden } from "@/store/runtime";

const SPEED_LABEL: Record<SimSpeed, { short: string; hint: string }> = {
  1: { short: "1× Realtime", hint: "One simulated second per second" },
  5: { short: "5× Fast", hint: "Five simulated seconds per second" },
  20: { short: "20× Demo", hint: "Twenty simulated seconds per second" },
};

export function SimulationDrawer() {
  const { open, speed, order, profiles, selected, links } = useGarden((s) => ({
    open: s.drawerOpen,
    speed: s.speed,
    order: s.order,
    profiles: s.profiles,
    selected: s.selectedHerbId,
    links: s.links,
  }));
  const liveMoisture = useGarden((s) => s.runtime[s.selectedHerbId]?.telemetry?.moisture ?? null);
  const threshold = useGarden((s) => s.runtime[s.selectedHerbId]?.threshold ?? 0);
  const [drag, setDrag] = useState<number | null>(null);
  const link = links[selected] ?? "online";

  // ` toggles the harness, like a dev console.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "`" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      actions().setDrawerOpen(!actions().drawerOpen);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sliderValue = drag ?? (liveMoisture === null ? 0 : Math.round(liveMoisture));

  return (
    <aside
      aria-label="Simulation harness"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-bench-rule bg-bench/[0.97] text-bench-text shadow-[0_-18px_40px_-20px_rgb(0_0_0/0.45)] backdrop-blur"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-8">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="sim-panel"
          onClick={() => actions().setDrawerOpen(!open)}
          className="flex h-12 w-full items-center gap-3 text-left"
        >
          <FlaskConical className="size-4 text-bench-muted" aria-hidden />
          <span className="shrink-0 text-[13px] font-semibold whitespace-nowrap">Simulation harness</span>
          <span className="hidden shrink-0 rounded bg-bench-raised px-1.5 py-0.5 font-mono text-[10px] text-bench-muted ring-1 ring-bench-rule sm:inline">
            DEV
          </span>
          <span className="truncate text-[12px] text-bench-muted">
            {open
              ? "No hardware is attached. Everything above is driven by these fake sensors."
              : "No hardware attached — open this to fake sensor readings and skip time"}
          </span>
          <span className="ml-auto hidden shrink-0 font-mono text-[11px] text-bench-muted lg:inline">
            {SPEED_LABEL[speed].short} · {profiles[selected]?.name} · {link}
          </span>
          <kbd className="hidden shrink-0 rounded border border-bench-rule px-1.5 font-mono text-[10px] text-bench-muted sm:inline">
            `
          </kbd>
          <ChevronUp
            className={cn("size-4 shrink-0 transition-transform duration-300", open ? "rotate-180" : "")}
            aria-hidden
          />
        </button>

        <div
          id="sim-panel"
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
          inert={!open}
        >
          <div className="overflow-hidden border-t border-bench-rule">
            <DemoWalkthrough />
            <div className="grid gap-x-8 gap-y-6 py-5 pb-6 md:grid-cols-2 xl:grid-cols-[1.1fr_1.4fr_1fr_1fr]">
              <Group label="Which pot" hint="The two controls to the right act on this pot.">
                <Segmented
                  theme="bench"
                  size="sm"
                  label="Which pot"
                  value={selected}
                  onChange={(id) => actions().selectHerb(id)}
                  options={order.map((id) => ({
                    value: id,
                    label: profiles[id]!.name,
                  }))}
                  className="flex-wrap"
                />
              </Group>

              <Group
                label="Set soil moisture"
                value={`${sliderValue}%`}
                hint={`Line is at ${threshold}%. Drag below it to trigger a water alert.`}
              >
                <Slider
                  tone="bench"
                  min={0}
                  max={100}
                  step={1}
                  value={[sliderValue]}
                  disabled={link === "offline"}
                  onValueChange={([v]) => {
                    if (v === undefined) return;
                    setDrag(v);
                    actions().forceMoisture(selected, v);
                  }}
                  onValueCommit={() => setDrag(null)}
                  thumbLabel={`Force ${profiles[selected]?.name} soil moisture`}
                />
              </Group>

              <Group label="Clock speed" hint="20× makes a 60 s watering run take 3 s.">
                <Segmented
                  theme="bench"
                  size="sm"
                  label="Clock speed"
                  value={speed}
                  onChange={(v) => actions().setSpeed(v)}
                  options={SIM_SPEEDS.map((v) => ({
                    value: v,
                    label: (
                      <>
                        {v === 20 && <Zap aria-hidden />}
                        {SPEED_LABEL[v].short}
                      </>
                    ),
                    hint: SPEED_LABEL[v].hint,
                  }))}
                />
              </Group>

              <div className="grid gap-6 sm:grid-cols-2 md:col-span-2 xl:col-span-1 xl:grid-cols-1">
                <Group label="Skip days" hint="Moves every pot along its regrowth cycle.">
                  <div className="flex gap-2">
                    {[1, 3].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => actions().advanceDays(d)}
                        className="inline-flex h-7 items-center gap-1.5 rounded-full bg-bench-raised px-3 text-[12px] font-semibold ring-1 ring-bench-rule transition-colors hover:bg-bench-rule"
                      >
                        <FastForward className="size-3.5" aria-hidden />+{d} {d === 1 ? "Day" : "Days"}
                      </button>
                    ))}
                  </div>
                </Group>
                <Group label="Sensor link" hint="Glitch drops packets. Offline hides the pot entirely.">
                  <Segmented<LinkMode>
                    theme="bench"
                    size="sm"
                    label={`Network link for ${profiles[selected]?.name}`}
                    value={link}
                    onChange={(m) => actions().setLink(selected, m)}
                    options={[
                      {
                        value: "online",
                        label: (
                          <>
                            <Wifi aria-hidden />
                            Stable
                          </>
                        ),
                        hint: "Healthy link",
                      },
                      {
                        value: "lossy",
                        label: (
                          <>
                            <Radio aria-hidden />
                            Glitch
                          </>
                        ),
                        hint: "40% telemetry packet loss, weak RSSI",
                      },
                      {
                        value: "offline",
                        label: (
                          <>
                            <WifiOff aria-hidden />
                            Offline
                          </>
                        ),
                        hint: "Sensor disconnected; broker publishes last will",
                      },
                    ]}
                  />
                </Group>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Group({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="font-sans text-[11px] font-semibold tracking-[0.14em] text-bench-muted uppercase">
          {label}
        </span>
        {value && <span className="tabular font-mono text-[12px] font-semibold">{value}</span>}
      </div>
      {children}
      {hint && <p className="mt-2 text-[11px] text-bench-muted">{hint}</p>}
    </div>
  );
}
