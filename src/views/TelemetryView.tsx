import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Droplet,
  Droplets,
  Gauge,
  Loader2,
  Play,
  ShieldAlert,
  Square,
  Thermometer,
  WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";
import { MoistureChart, Sparkline } from "@/components/MoistureChart";
import { MoistureGauge } from "@/components/MoistureGauge";
import { WATER_COPY, moistureTone, waterStatus, type WaterStatus } from "@/components/status";
import { StatusDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PHYSICS } from "@/engine/physics";
import { useNow } from "@/lib/hooks";
import { cn, formatClock, formatDuration } from "@/lib/utils";
import type { HerbRuntime } from "@/store/gardenStore";
import { actions, useGarden, useHerbTelemetry } from "@/store/runtime";

export function TelemetryView() {
  const selected = useGarden((s) => s.selectedHerbId);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
      <NodeRail />
      <div key={selected} className="min-w-0 animate-fade space-y-5">
        <HerbDetail herbId={selected} />
      </div>
    </div>
  );
}

const RAIL_WORD = {
  water: "watering",
  amber: "needs water",
  leaf: "ok",
  offline: "offline",
} as const;

function NodeRail() {
  const { order, profiles, runtime, selected } = useGarden((s) => ({
    order: s.order,
    profiles: s.profiles,
    runtime: s.runtime,
    selected: s.selectedHerbId,
  }));
  const toneFor = (rt: HerbRuntime) => {
    const status = waterStatus(rt);
    if (rt.valve.state === "OPEN") return "water" as const;
    return status === "needs" ? "amber" : status === "ok" ? "leaf" : "offline";
  };

  return (
    <nav aria-label="Sensor nodes" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <p className="eyebrow mb-3 hidden lg:block">Nodes · {order.length}</p>
      <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {order.map((id) => {
          const rt = runtime[id]!;
          const active = id === selected;
          const tone = toneFor(rt);
          return (
            <li key={id} className="shrink-0">
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => actions().selectHerb(id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-200",
                  active ? "border-ink bg-card shadow-card" : "border-transparent hover:border-rule hover:bg-card/60",
                )}
              >
                <StatusDot tone={tone} pulse={tone === "water"} />
                <span className="min-w-0">
                  <span className="block text-[14px] leading-tight font-semibold">{profiles[id]!.name}</span>
                  <span className="block font-mono text-[10.5px] text-ink-muted">
                    node-{id} · {RAIL_WORD[tone]}
                  </span>
                </span>
                <span className="ml-auto hidden text-right lg:block">
                  <span className="tabular block font-mono text-[13px] font-semibold">
                    {rt.online && rt.telemetry ? `${rt.telemetry.moisture.toFixed(1)}%` : "—"}
                  </span>
                  <span className={cn("block", active ? "text-ink" : "text-ink-muted")}>
                    <Sparkline history={rt.history} threshold={rt.threshold} width={56} height={16} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const BANNER_STYLE: Record<WaterStatus, { wrap: string; icon: typeof Droplet; iconWrap: string }> = {
  needs: {
    wrap: "bg-amber-wash border-amber/50 text-amber-deep",
    icon: Droplet,
    iconWrap: "bg-amber text-white",
  },
  ok: {
    wrap: "bg-leaf-wash border-leaf/35 text-leaf-deep",
    icon: CheckCircle2,
    iconWrap: "bg-leaf text-white",
  },
  offline: {
    wrap: "bg-offline-wash border-rule-strong text-ink-soft",
    icon: WifiOff,
    iconWrap: "bg-offline text-white",
  },
  pending: {
    wrap: "bg-paper-deep border-rule text-ink-soft",
    icon: Loader2,
    iconWrap: "bg-ink-muted text-white",
  },
};

function HerbDetail({ herbId }: { herbId: string }) {
  const { profile, runtime } = useHerbTelemetry(herbId);
  const status = waterStatus(runtime);
  const reading = runtime.online ? (runtime.telemetry?.moisture ?? null) : null;
  const style = BANNER_STYLE[status];
  const Icon = style.icon;
  const watering = runtime.valve.state === "OPEN";

  const pct = reading?.toFixed(1);
  const detail =
    status === "needs"
      ? watering
        ? `Watering: ${pct}% and rising. This flips to “No Water Needed” once it passes your ${runtime.threshold}% line.`
        : `Soil is ${pct}%, below the ${runtime.threshold}% line you set. Start a run; the node stops itself after 60 s.`
      : status === "ok"
        ? watering
          ? `Soil is ${pct}%, already above your ${runtime.threshold}% line. Stop the run, or let the 60 s cutoff do it.`
          : `Soil is ${pct}%, above the ${runtime.threshold}% line you set. Nothing to do.`
        : status === "offline"
          ? "No packets from this node, so there is no reading and the valve can't be commanded. Check the pot by hand. (Use the harness below to bring it back.)"
          : "Waiting for the first telemetry packet.";

  const bannerAction = !runtime.online ? null : watering ? (
    <Button variant="stop" onClick={() => actions().stopWatering(herbId)}>
      <Square aria-hidden className="fill-current" />
      Stop Watering
    </Button>
  ) : status === "needs" ? (
    <Button variant="water" onClick={() => actions().startWatering(herbId)}>
      <Play aria-hidden className="fill-current" />
      Start Watering
    </Button>
  ) : null;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Engineering telemetry · node-{herbId}</p>
          <h1 className="mt-1 font-display text-[40px] leading-none font-medium tracking-[-0.025em]">
            {profile.name} <span className="text-ink-muted italic">{profile.variety}</span>
          </h1>
        </div>
        <code className="rounded-md border border-rule bg-card/70 px-2 py-1 font-mono text-[11px] text-ink-muted">
          garden/{herbId}/#
        </code>
      </header>

      <section
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "flex items-center gap-4 rounded-2xl border px-5 py-4 transition-colors duration-500 sm:px-6 sm:py-5",
          style.wrap,
        )}
      >
        <span
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-full transition-colors duration-500",
            style.iconWrap,
          )}
        >
          <Icon
            className={cn("size-6", status === "pending" && "animate-spin", status === "needs" && "animate-bob")}
            aria-hidden
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[28px] leading-tight font-semibold tracking-[-0.015em] sm:text-[32px]">
            {WATER_COPY[status].title}
          </p>
          <p className="text-[14px] text-ink-soft">{detail}</p>
        </div>
        {bannerAction && <div className="shrink-0 self-center max-sm:hidden">{bannerAction}</div>}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <GaugeCard herbId={herbId} reading={reading} />
        <ValveCard herbId={herbId} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <Card title="Moisture trend" meta={`last ${runtime.history.length} readings`}>
          <MoistureChart
            history={runtime.history}
            threshold={runtime.threshold}
            optimalMin={profile.optimalSoilMoistureMin}
            optimalMax={profile.optimalSoilMoistureMax}
          />
        </Card>
        <Diagnostics runtime={runtime} />
      </div>

      <MqttLog runtime={runtime} />
    </>
  );
}

function Card({
  title,
  meta,
  children,
  className,
}: {
  title: string;
  meta?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-rule bg-card p-5 shadow-card sm:p-6", className)}>
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
        {meta && <span className="font-mono text-[11px] text-ink-muted">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

function GaugeCard({ herbId, reading }: { herbId: string; reading: number | null }) {
  const { profile, runtime } = useHerbTelemetry(herbId);
  return (
    <Card title="Live soil moisture" meta="capacitive probe · ADC">
      <MoistureGauge
        value={reading}
        threshold={runtime.threshold}
        optimalMin={profile.optimalSoilMoistureMin}
        optimalMax={profile.optimalSoilMoistureMax}
        tone={moistureTone(runtime)}
      />
      <div className="mt-2 border-t border-rule pt-5">
        <div className="flex items-baseline justify-between">
          <label htmlFor={`threshold-${herbId}`} className="text-[13px] font-semibold">
            Water when soil drops below
          </label>
          <span className="tabular font-mono text-[13px] font-semibold">{runtime.threshold}%</span>
        </div>
        <Slider
          id={`threshold-${herbId}`}
          className="mt-3"
          min={0}
          max={100}
          step={1}
          value={[runtime.threshold]}
          onValueChange={([v]) => v !== undefined && actions().setThreshold(herbId, v)}
          thumbLabel="Watering threshold"
          trackChildren={
            <span
              className="absolute inset-y-0 bg-leaf/25"
              style={{
                left: `${profile.optimalSoilMoistureMin}%`,
                width: `${profile.optimalSoilMoistureMax - profile.optimalSoilMoistureMin}%`,
              }}
            />
          }
        />
        <p className="mt-2 text-[12px] text-ink-muted">
          Drag it and the banner above updates immediately. The green band is {profile.name.toLowerCase()}’s optimal
          range; a ±0.5% deadband stops the advice flickering on sensor noise.
        </p>
      </div>
    </Card>
  );
}

function ValveCard({ herbId }: { herbId: string }) {
  const { runtime } = useHerbTelemetry(herbId);
  const open = runtime.valve.state === "OPEN";
  const remaining = PHYSICS.maxRunSeconds - runtime.valve.runSeconds;
  const warning = runtime.valve.warning;

  return (
    <Card title="Irrigation valve" meta={`solenoid · ${PHYSICS.flowRateLpm.toFixed(1)} L/min meter`}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative mx-auto grid size-32 shrink-0 place-items-center sm:mx-0" aria-hidden>
          {open && (
            <>
              <span className="absolute inset-0 animate-ripple rounded-full bg-water/30" />
              <span className="absolute inset-0 animate-ripple rounded-full bg-water/30 [animation-delay:0.6s]" />
              <span className="absolute inset-0 animate-ripple rounded-full bg-water/30 [animation-delay:1.2s]" />
            </>
          )}
          <span
            className={cn(
              "relative grid size-24 place-items-center rounded-full transition-colors duration-500",
              open
                ? "bg-water text-white shadow-[0_12px_30px_-10px_var(--color-water)]"
                : "bg-paper-deep text-ink-muted",
            )}
          >
            <Droplet className={cn("size-10", open && "animate-bob fill-white/25")} strokeWidth={1.75} />
          </span>
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-baseline gap-3">
            <span
              className={cn("text-[13px] font-semibold tracking-wide", open ? "text-water-deep" : "text-ink-muted")}
            >
              VALVE {runtime.valve.state}
            </span>
            <span className="tabular font-mono text-[13px] text-ink-soft">
              {runtime.valve.flowRateLpm.toFixed(2)} L/min
            </span>
          </div>

          {open ? (
            <Button
              variant="stop"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => actions().stopWatering(herbId)}
              disabled={!runtime.online}
            >
              <Square aria-hidden className="fill-current" />
              Stop Watering
            </Button>
          ) : (
            <Button
              variant="water"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => actions().startWatering(herbId)}
              disabled={!runtime.online}
            >
              <Play aria-hidden className="fill-current" />
              Start Watering
            </Button>
          )}
          <p className="text-[12px] text-ink-muted">
            {!runtime.online
              ? "Node offline: the command would never arrive."
              : open
                ? "Manual run. Stop it here, or let the node's 60 s watchdog close the valve."
                : runtime.needsWater
                  ? "Soil is below your line. Start a run."
                  : "Soil is fine. Running the valve anyway is allowed but not needed."}
          </p>

          <div>
            <div className="flex justify-between text-[12px] text-ink-muted">
              <span>
                {open ? "Run" : "Last run"}{" "}
                <span className="tabular font-mono text-ink">{formatDuration(runtime.valve.runSeconds)}</span>
              </span>
              <span>
                {open
                  ? `Auto-cutoff in ${Math.max(0, Math.ceil(remaining))} s`
                  : `Watchdog ${PHYSICS.maxRunSeconds} s max`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-water-wash">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300 ease-linear",
                  remaining <= 10 && open ? "bg-amber" : "bg-water",
                )}
                style={{
                  width: open
                    ? `${(Math.min(runtime.valve.runSeconds, PHYSICS.maxRunSeconds) / PHYSICS.maxRunSeconds) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {warning && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-xl border border-amber/50 bg-amber-wash px-4 py-3 text-[13px] text-amber-deep"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">{warning}.</strong> The node closed the valve after{" "}
            {PHYSICS.maxRunSeconds} s of continuous flow.
          </span>
        </div>
      )}

      <dl className="mt-5 grid grid-cols-2 border-t border-rule pt-5">
        <div>
          <dt className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            <Droplet className="size-3.5" aria-hidden />
            {open ? "This session" : "Last session"}
          </dt>
          <dd className="mt-1 text-[28px] leading-none font-semibold tracking-[-0.02em]">
            {runtime.water.sessionLiters.toFixed(2)}
            <span className="ml-1 text-[14px] text-ink-muted">L</span>
          </dd>
        </div>
        <div className="border-l border-rule pl-5">
          <dt className="flex items-center gap-1.5 text-[12px] text-ink-muted">
            <Droplets className="size-3.5" aria-hidden />
            Lifetime
          </dt>
          <dd className="mt-1 text-[28px] leading-none font-semibold tracking-[-0.02em]">
            {runtime.water.totalLiters.toFixed(2)}
            <span className="ml-1 text-[14px] text-ink-muted">L</span>
          </dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-rule pt-4">
        <p className="text-[12px] text-ink-muted">Recent runs</p>
        {runtime.runs.length ? (
          <ul className="mt-2 space-y-1.5">
            {runtime.runs.map((run) => (
              <li key={run.id} className="tabular flex items-center gap-3 font-mono text-[12px]">
                <span className="text-ink-muted">{formatClock(run.endedAt)}</span>
                <span className="text-ink">{formatDuration(run.seconds)}</span>
                <span className="text-ink">{run.liters.toFixed(2)} L</span>
                <span
                  className={cn(
                    "ml-auto rounded px-1.5 py-0.5 font-sans text-[11px] font-semibold",
                    run.cause === "watchdog"
                      ? "bg-amber-wash text-amber-deep"
                      : run.cause === "target"
                        ? "bg-water-wash text-water-deep"
                        : "bg-paper-deep text-ink-soft",
                  )}
                >
                  {RUN_CAUSE[run.cause]}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-ink-muted">No runs yet this session.</p>
        )}
      </div>
    </Card>
  );
}

const RUN_CAUSE = {
  manual: "Stopped",
  target: "Target reached",
  watchdog: "Watchdog cutoff",
} as const;

function SignalBars({ rssi, online }: { rssi: number | undefined; online: boolean }) {
  const level = !online || rssi === undefined ? 0 : rssi > -60 ? 4 : rssi > -70 ? 3 : rssi > -80 ? 2 : 1;
  return (
    <span className="inline-flex items-end gap-[3px]" aria-hidden>
      {[1, 2, 3, 4].map((b) => (
        <span
          key={b}
          className={cn("w-[4px] rounded-sm", b <= level ? (level <= 2 ? "bg-amber" : "bg-ink") : "bg-rule")}
          style={{ height: 4 + b * 3 }}
        />
      ))}
    </span>
  );
}

function Diagnostics({ runtime }: { runtime: HerbRuntime }) {
  const now = useNow(250);
  const speed = useGarden((s) => s.speed);
  const age = runtime.lastPacketAt === null ? null : Math.max(0, now - runtime.lastPacketAt) / 1000;
  const stale = age !== null && age * 1000 > (3 * 1000) / speed + 500;
  const t = runtime.telemetry;

  const rows = [
    {
      icon: <Thermometer className="size-4" aria-hidden />,
      label: "Temperature",
      value: t ? `${t.temperature.toFixed(1)} °C` : "—",
    },
    {
      icon: <SignalBars rssi={t?.rssi} online={runtime.online} />,
      label: "Signal",
      value: runtime.online && t ? `${t.rssi} dBm` : "—",
    },
    {
      icon: (
        <StatusDot
          tone={!runtime.online ? "offline" : stale ? "amber" : "leaf"}
          pulse={runtime.online && !stale}
          className="mx-1"
        />
      ),
      label: "Link",
      value: !runtime.online ? "Offline (LWT)" : stale ? "Stale" : "Online",
    },
    {
      icon: <Gauge className="size-4" aria-hidden />,
      label: "Last packet",
      value: age === null ? "—" : `${age.toFixed(1)} s ago`,
    },
  ];

  return (
    <Card title="Node diagnostics" meta="ESP32 · virtual">
      <dl className="divide-y divide-rule">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="grid w-5 place-items-center text-ink-muted">{r.icon}</span>
            <dt className="text-[13px] text-ink-soft">{r.label}</dt>
            <dd
              className={cn(
                "tabular ml-auto font-mono text-[13px] font-semibold",
                stale && r.label === "Last packet" && "text-amber-deep",
              )}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function MqttLog({ runtime }: { runtime: HerbRuntime }) {
  const entries = runtime.log.slice().reverse();
  return (
    <Card title="Message log" meta="simulated MQTT · newest first">
      <div className="-mx-5 overflow-x-auto sm:-mx-6">
        <table className="w-full min-w-[640px] table-fixed font-mono text-[12px]">
          <colgroup>
            <col className="w-[96px] sm:w-[104px]" />
            <col className="w-[32px]" />
            <col className="w-[240px]" />
            <col />
          </colgroup>
          <thead className="sr-only">
            <tr>
              <th>Time</th>
              <th>Direction</th>
              <th>Topic</th>
              <th>Payload</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-rule/70 first:border-t-0">
                <td className="py-1.5 pr-3 pl-5 whitespace-nowrap text-ink-muted sm:pl-6">
                  {formatClock(e.receivedAt)}
                </td>
                <td className="py-1.5 pr-3">
                  {e.direction === "out" ? (
                    <ArrowUpRight className="size-3.5 text-water" aria-label="Published by app" />
                  ) : (
                    <ArrowDownLeft className="size-3.5 text-ink-muted" aria-label="Received from node" />
                  )}
                </td>
                <td className="py-1.5 pr-3 whitespace-nowrap text-ink">{e.topic}</td>
                <td className="max-w-0 truncate py-1.5 pr-5 text-ink-muted sm:pr-6" title={e.payload}>
                  {e.payload}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
