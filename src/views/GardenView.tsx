import { Check, Droplet, Droplets, Loader2, Square, WifiOff } from "lucide-react";
import type { CSSProperties } from "react";
import { HerbIllustration } from "@/components/HerbIllustration";
import { MoistureBar } from "@/components/MoistureBar";
import { adviceInput, moistureTone } from "@/components/status";
import { Button } from "@/components/ui/button";
import { wateringAdvice, type Advice } from "@/domain/watering";
import { cn } from "@/lib/utils";
import { actions, useGarden, useHerbTelemetry } from "@/store/runtime";

export function GardenView() {
  const order = useGarden((s) => s.order);
  return (
    <div className="space-y-10">
      <GardenSummary />
      <section aria-label="Herb pots" className="stagger grid gap-5 md:grid-cols-2">
        {order.map((id, i) => (
          <HerbCard key={id} herbId={id} index={i} />
        ))}
      </section>
    </div>
  );
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** The headline is the instruction. Everything else on this page is a pot. */
function GardenSummary() {
  // Select stable references only; derive in render so the selector never returns fresh objects.
  const { order, profiles, runtime } = useGarden((s) => ({ order: s.order, profiles: s.profiles, runtime: s.runtime }));
  const advice = order.map((id) => wateringAdvice(profiles[id]!, adviceInput(runtime[id]!)));
  const thirsty = advice.filter((a) => a.kind === "water").map((a) => a.title.replace(/^Water /, ""));
  const watering = advice.filter((a) => a.kind === "watering").length;
  const offline = advice.filter((a) => a.kind === "offline").length;
  const liters = order.reduce((sum, id) => sum + runtime[id]!.water.totalLiters, 0);

  const headline = thirsty.length
    ? `Water ${joinNames(thirsty)}.`
    : watering
      ? `Watering ${watering === 1 ? "one pot" : `${watering} pots`}. Nothing else to do.`
      : "Every pot is watered. Nothing to do.";

  const stats = [
    `${thirsty.length} of ${order.length} ${thirsty.length === 1 ? "needs" : "need"} water`,
    offline ? `${offline} sensor${offline === 1 ? "" : "s"} offline` : "all sensors online",
    `${liters.toFixed(1)} L used lifetime`,
  ];

  return (
    <section className="animate-rise">
      <p className="eyebrow">Today at the windowsill</p>
      <h1 className="mt-3 max-w-[20ch] font-display text-[40px] leading-[1.02] font-medium tracking-[-0.025em] text-balance text-ink sm:text-[56px]">
        {headline}
      </h1>
      <p className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-muted">
        {stats.map((t, i) => (
          <span key={t} className="flex items-center gap-3">
            {i > 0 && <span aria-hidden className="size-1 rounded-full bg-rule-strong" />}
            {t}
          </span>
        ))}
      </p>
    </section>
  );
}

const ADVICE_ICON: Record<Advice["kind"], typeof Droplet> = {
  water: Droplet,
  watering: Droplets,
  ok: Check,
  offline: WifiOff,
  pending: Loader2,
};

const ADVICE_TONE: Record<Advice["tone"], { box: string; icon: string }> = {
  amber: { box: "border-amber/40 bg-amber-wash/60 text-amber-deep", icon: "bg-amber text-white" },
  leaf: { box: "border-leaf/35 bg-leaf-wash/60 text-leaf-deep", icon: "bg-leaf text-white" },
  water: { box: "border-water/35 bg-water-wash/60 text-water-deep", icon: "bg-water text-white" },
  offline: { box: "border-rule-strong bg-offline-wash/70 text-ink-soft", icon: "bg-offline text-white" },
  neutral: { box: "border-rule bg-paper-deep/50 text-ink-soft", icon: "bg-ink-muted text-white" },
};

function HerbCard({ herbId, index }: { herbId: string; index: number }) {
  const { profile, runtime } = useHerbTelemetry(herbId);
  const advice = wateringAdvice(profile, adviceInput(runtime));
  const watering = runtime.valve.state === "OPEN";
  const reading = runtime.online ? (runtime.telemetry?.moisture ?? null) : null;
  const Icon = ADVICE_ICON[advice.kind];
  const tone = ADVICE_TONE[advice.tone];

  return (
    <article
      style={{ "--i": index } as CSSProperties}
      className={cn(
        "group relative grid overflow-hidden rounded-[22px] border bg-card shadow-card transition-[box-shadow,border-color] duration-300 hover:shadow-lift sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]",
        advice.kind === "water" ? "border-amber/50" : "border-rule",
      )}
      aria-labelledby={`herb-${herbId}-name`}
    >
      {/* Specimen panel */}
      <div className="relative flex flex-col justify-between border-b border-rule bg-paper-deep/60 p-5 sm:border-r sm:border-b-0">
        <span className="font-mono text-[11px] tracking-wider text-ink-muted">
          No. {String(index + 1).padStart(2, "0")}
        </span>
        <HerbIllustration
          herbId={herbId}
          moisture={reading}
          watering={watering}
          className="mx-auto my-2 h-44 w-auto transition-transform duration-700 ease-out group-hover:-rotate-2 sm:h-52"
        />
        <div>
          <div className="flex items-baseline justify-between text-[12px]">
            <span className="font-medium text-ink-soft">Soil</span>
            <span className="tabular font-mono font-semibold text-ink">
              {reading === null ? "—" : `${reading.toFixed(1)}%`}
            </span>
          </div>
          <MoistureBar value={reading} threshold={runtime.threshold} tone={moistureTone(runtime)} className="mt-2" />
          <p className="mt-1.5 text-[11px] text-ink-muted">
            Line at {runtime.threshold}% · likes {profile.optimalSoilMoistureMin}–{profile.optimalSoilMoistureMax}%
          </p>
        </div>
      </div>

      {/* Advice panel */}
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div>
          <h2
            id={`herb-${herbId}-name`}
            className="font-display text-[34px] leading-none font-medium tracking-[-0.02em] text-ink"
          >
            {profile.name}
          </h2>
          <p className="mt-1 font-display text-[18px] text-ink-muted italic">{profile.variety}</p>
        </div>

        <div className={cn("flex items-start gap-3 rounded-xl border px-3.5 py-3", tone.box)} aria-live="polite">
          <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", tone.icon)}>
            <Icon
              className={cn(
                "size-3.5",
                advice.kind === "watering" && "animate-bob",
                advice.kind === "pending" && "animate-spin",
              )}
              aria-hidden
            />
          </span>
          <span className="min-w-0 text-[14px] leading-snug">
            <span className="font-semibold">{advice.title}.</span> <span className="opacity-90">{advice.detail}</span>
          </span>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          {watering ? (
            <Button variant="stop" onClick={() => actions().stopWatering(herbId)}>
              <Square aria-hidden className="fill-current" />
              {runtime.autoTarget !== null
                ? `Stop early (auto-stops at ${Math.round(runtime.autoTarget)}%)`
                : "Stop watering"}
            </Button>
          ) : (
            <Button
              variant={advice.kind === "water" ? "water" : "outline"}
              disabled={!runtime.online}
              onClick={() => actions().quickWater(herbId)}
              title="Opens the valve and closes it again at the middle of the optimal range"
            >
              <Droplet aria-hidden />
              {advice.kind === "water" ? "Water now" : "Water anyway"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              actions().selectHerb(herbId);
              actions().setView("telemetry");
            }}
          >
            Details
          </Button>
        </div>
      </div>
    </article>
  );
}
