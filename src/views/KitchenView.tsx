import { Activity, AlertTriangle, Check, Droplet, Droplets, Scissors, Sprout, Square, WifiOff } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { HarvestCycle } from "@/components/HarvestCycle";
import { HerbIllustration } from "@/components/HerbIllustration";
import { MoistureBar } from "@/components/MoistureBar";
import { HARVEST_TONE, moistureTone, waterStatus } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HARVEST_SHORT_LABEL, harvestState, type HarvestStatus } from "@/domain/harvest";
import { gardenTodo, nextSteps, type NextStep, type StepInput } from "@/domain/nextStep";
import type { HerbRuntime } from "@/store/gardenStore";
import { cn, formatClock } from "@/lib/utils";
import { actions, useGarden, useHerbTelemetry } from "@/store/runtime";

const HARVEST_ICON: Record<HarvestStatus, typeof Sprout> = {
  peak: Scissors,
  bolting: AlertTriangle,
  regrowing: Sprout,
};

export function KitchenView() {
  const order = useGarden((s) => s.order);
  return (
    <div className="space-y-12">
      <KitchenSummary />
      <section aria-label="Herb pots" className="stagger grid gap-5 md:grid-cols-2">
        {order.map((id, i) => (
          <HerbCard key={id} herbId={id} index={i} />
        ))}
      </section>
      <HarvestJournal />
    </div>
  );
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

const stepInput = (rt: HerbRuntime): StepInput => ({
  online: rt.online,
  needsWater: rt.needsWater,
  valveOpen: rt.valve.state === "OPEN",
  autoTarget: rt.autoTarget,
  moisture: rt.telemetry?.moisture ?? null,
  threshold: rt.threshold,
});

const STEP_ICON: Record<NextStep["kind"], typeof Sprout> = {
  cut: AlertTriangle,
  clip: Scissors,
  water: Droplet,
  watering: Droplets,
  offline: WifiOff,
  wait: Sprout,
};

const STEP_TONE: Record<NextStep["tone"], { box: string; icon: string }> = {
  amber: {
    box: "border-amber/40 bg-amber-wash/60 text-amber-deep",
    icon: "bg-amber text-white",
  },
  leaf: {
    box: "border-leaf/35 bg-leaf-wash/60 text-leaf-deep",
    icon: "bg-leaf text-white",
  },
  water: {
    box: "border-water/35 bg-water-wash/60 text-water-deep",
    icon: "bg-water text-white",
  },
  offline: {
    box: "border-rule-strong bg-offline-wash/70 text-ink-soft",
    icon: "bg-offline text-white",
  },
  neutral: {
    box: "border-rule bg-paper-deep/50 text-ink-soft",
    icon: "bg-ink-muted text-white",
  },
};

/** The headline is the top instruction; the list beside it is every instruction, each with its button. */
function KitchenSummary() {
  // Select stable references only; derive in render so the selector never returns fresh objects.
  const { order, profiles, runtime, totalHarvests } = useGarden((s) => ({
    order: s.order,
    profiles: s.profiles,
    runtime: s.runtime,
    totalHarvests: s.totalHarvests,
  }));
  const herbs = order.map((id) => ({
    profile: profiles[id]!,
    rt: stepInput(runtime[id]!),
  }));
  const todo = gardenTodo(herbs);
  const liters = order.reduce((sum, id) => sum + runtime[id]!.water.totalLiters, 0);

  const cut = todo.filter((t) => t.kind === "cut").map((t) => profiles[t.herbId]!.name);
  const clip = todo.filter((t) => t.kind === "clip").map((t) => profiles[t.herbId]!.name);
  const thirsty = todo.filter((t) => t.kind === "water").length;
  const nextUp = herbs
    .map(({ profile }) => ({
      name: profile.name,
      days: harvestState(profile).daysUntilPeak,
    }))
    .filter((h) => h.days > 0)
    .sort((a, b) => a.days - b.days)[0];

  const headline = cut.length
    ? `Cut ${joinNames(cut)} today${clip.length ? `, then clip ${joinNames(clip)}` : ""}.`
    : clip.length
      ? `${joinNames(clip)} ${clip.length === 1 ? "is" : "are"} ready to clip.`
      : "Nothing to clip yet. Let the garden regrow.";

  const stats = [
    `${clip.length + cut.length} of ${herbs.length} ready`,
    `${thirsty} ${thirsty === 1 ? "needs" : "need"} water`,
    `${totalHarvests} ${totalHarvests === 1 ? "harvest" : "harvests"} logged`,
    `${liters.toFixed(1)} L used lifetime`,
  ];

  return (
    <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-start">
      <div className="animate-rise">
        <p className="eyebrow">Today at the windowsill</p>
        <h1 className="mt-3 max-w-[18ch] font-display text-[40px] leading-[1.02] font-medium tracking-[-0.025em] text-balance text-ink sm:text-[56px]">
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
      </div>

      <section
        aria-labelledby="todo-title"
        className="animate-rise rounded-2xl border border-rule bg-card/70 [animation-delay:120ms]"
      >
        <header className="flex items-baseline justify-between border-b border-rule px-5 py-3">
          <h2 id="todo-title" className="text-[13px] font-semibold">
            To do
          </h2>
          <span className="font-mono text-[11px] text-ink-muted">
            {todo.length ? `${todo.length} ${todo.length === 1 ? "action" : "actions"}` : "all clear"}
          </span>
        </header>
        {todo.length ? (
          <ol className="divide-y divide-rule">
            {todo.map((t) => (
              <TodoRow key={`${t.herbId}-${t.kind}`} step={t} herbId={t.herbId} />
            ))}
          </ol>
        ) : (
          <div className="flex items-center gap-3 px-5 py-5 text-[14px] text-ink-soft">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-leaf text-white">
              <Check className="size-4" aria-hidden />
            </span>
            <span>
              Nothing needs you right now.
              {nextUp && (
                <>
                  {" "}
                  Next up: <strong className="font-semibold text-ink">{nextUp.name}</strong> in about {nextUp.days}{" "}
                  {nextUp.days === 1 ? "day" : "days"}.
                </>
              )}
            </span>
          </div>
        )}
      </section>
    </section>
  );
}

function TodoRow({ step, herbId }: { step: NextStep; herbId: string }) {
  const Icon = STEP_ICON[step.kind];
  const tone = STEP_TONE[step.tone];
  const button = (() => {
    switch (step.kind) {
      case "cut":
      case "clip":
        return (
          <Button size="sm" variant="primary" onClick={() => actions().logHarvest(herbId)}>
            <Scissors aria-hidden />
            Log Harvest
          </Button>
        );
      case "water":
        return (
          <Button size="sm" variant="water" onClick={() => actions().quickWater(herbId)}>
            <Droplet aria-hidden />
            Water now
          </Button>
        );
      case "watering":
        return (
          <Button size="sm" variant="stop" onClick={() => actions().stopWatering(herbId)}>
            <Square aria-hidden className="fill-current" />
            Stop
          </Button>
        );
      case "offline":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              actions().selectHerb(herbId);
              actions().setView("telemetry");
            }}
          >
            <Activity aria-hidden />
            Diagnose
          </Button>
        );
      default:
        return null;
    }
  })();

  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", tone.icon)}>
        <Icon className={cn("size-4", step.kind === "watering" && "animate-bob")} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] leading-tight font-semibold text-ink">{step.title}</span>
        <span className="block text-[12.5px] leading-snug text-ink-muted">{step.detail}</span>
      </span>
      {button && <span className="shrink-0">{button}</span>}
    </li>
  );
}

/** One line under the herb copy that says exactly what to do with this pot, in words, next to the buttons that do it. */
function NextStepBox({ steps }: { steps: NextStep[] }) {
  return (
    <ol className="space-y-1.5" aria-label="Next step">
      {steps.map((step) => {
        const Icon = STEP_ICON[step.kind];
        const tone = STEP_TONE[step.tone];
        return (
          <li key={step.kind} className={cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5", tone.box)}>
            <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", tone.icon)}>
              <Icon className={cn("size-3", step.kind === "watering" && "animate-bob")} aria-hidden />
            </span>
            <span className="min-w-0 text-[13px] leading-snug">
              <span className="font-semibold">{step.title}.</span> <span className="opacity-90">{step.detail}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function HerbCard({ herbId, index }: { herbId: string; index: number }) {
  const { profile, runtime } = useHerbTelemetry(herbId);
  const harvest = harvestState(profile);
  const water = waterStatus(runtime);
  const watering = runtime.valve.state === "OPEN";
  const reading = runtime.telemetry?.moisture ?? null;
  const HarvestIcon = HARVEST_ICON[harvest.status];
  const steps = nextSteps(profile, stepInput(runtime));
  const [justLogged, setJustLogged] = useState<number | null>(null);

  useEffect(() => {
    if (justLogged === null) return;
    const id = setTimeout(() => setJustLogged(null), 4000);
    return () => clearTimeout(id);
  }, [justLogged]);

  const onHarvest = () => {
    actions().logHarvest(herbId);
    setJustLogged(Date.now());
  };

  return (
    <article
      style={{ "--i": index } as CSSProperties}
      className={cn(
        "group relative grid overflow-hidden rounded-[22px] border bg-card shadow-card transition-[box-shadow,border-color] duration-300 hover:shadow-lift sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]",
        harvest.status === "bolting" ? "border-amber/50" : "border-rule",
      )}
      aria-labelledby={`herb-${herbId}-name`}
    >
      {/* Specimen panel */}
      <div className="relative flex flex-col justify-between border-b border-rule bg-paper-deep/60 p-5 sm:border-r sm:border-b-0">
        <div className="flex items-start justify-between">
          <span className="font-mono text-[11px] tracking-wider text-ink-muted">
            No. {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-[11px] text-ink-muted">~{profile.estYieldGrams} g</span>
        </div>
        <HerbIllustration
          herbId={herbId}
          moisture={reading}
          watering={watering}
          growth={profile.daysSinceLastCut / harvest.peakStartDay}
          bolting={harvest.status === "bolting"}
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
        </div>
      </div>

      {/* Culinary panel */}
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={HARVEST_TONE[harvest.status]}>
            <HarvestIcon aria-hidden />
            {HARVEST_SHORT_LABEL[harvest.status]}
          </Badge>
          {water === "needs" && !watering && (
            <Badge tone="amber">
              <Droplet aria-hidden />
              Thirsty
            </Badge>
          )}
          {watering && (
            <Badge tone="water">
              <Droplets aria-hidden className="animate-bob" />
              Watering
            </Badge>
          )}
          {water === "offline" && (
            <Badge tone="offline">
              <WifiOff aria-hidden />
              Offline
            </Badge>
          )}
        </div>

        <div>
          <h2
            id={`herb-${herbId}-name`}
            className="font-display text-[34px] leading-none font-medium tracking-[-0.02em] text-ink"
          >
            {profile.name}
          </h2>
          <p className="mt-1 font-display text-[18px] text-ink-muted italic">{profile.variety}</p>
          <p
            className={cn(
              "mt-3 text-[13px] font-semibold",
              harvest.status === "bolting"
                ? "text-amber-deep"
                : harvest.status === "peak"
                  ? "text-leaf-deep"
                  : "text-ink-soft",
            )}
          >
            {harvest.label}
          </p>
        </div>

        <HarvestCycle state={harvest} days={profile.daysSinceLastCut} cycle={profile.regrowthCycleDays} />

        <div>
          <p className="text-[14px] leading-relaxed text-ink-soft">{profile.flavorNotes}</p>
          <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Pairs well with">
            {profile.culinaryPairings.map((p) => (
              <li key={p} className="rounded-md border border-rule px-2 py-0.5 text-[12px] text-ink-soft">
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto space-y-3 pt-1">
          <NextStepBox steps={steps} />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={harvest.status === "regrowing" ? "outline" : "primary"}
              onClick={onHarvest}
              title="Records a clipping and resets this pot's regrowth clock to day 0"
            >
              <Scissors aria-hidden />
              Log Harvest
            </Button>
            {watering ? (
              <Button variant="stop" onClick={() => actions().stopWatering(herbId)}>
                <Square aria-hidden className="fill-current" />
                {runtime.autoTarget !== null
                  ? `Stop early (auto-stops at ${Math.round(runtime.autoTarget)}%)`
                  : "Stop watering"}
              </Button>
            ) : (
              water === "needs" && (
                <Button
                  variant="water"
                  onClick={() => actions().quickWater(herbId)}
                  title="Opens the valve and closes it again at the middle of the optimal range"
                >
                  <Droplet aria-hidden />
                  Water now
                </Button>
              )
            )}
            <span className="sr-only" aria-live="polite">
              {justLogged ? `Harvest of ${profile.name} logged` : ""}
            </span>
            {justLogged && (
              <span className="animate-fade text-[12px] text-leaf-deep" aria-hidden>
                Logged {formatClock(justLogged)}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function HarvestJournal() {
  const { harvests, profiles } = useGarden((s) => ({
    harvests: s.harvests,
    profiles: s.profiles,
  }));
  const grams = harvests.reduce((sum, h) => sum + h.estYieldGrams, 0);
  return (
    <section aria-labelledby="journal-title" className="grid gap-6 border-t border-rule pt-10 lg:grid-cols-[1fr_2fr]">
      <div>
        <p className="eyebrow">Kitchen journal</p>
        <h2 id="journal-title" className="mt-2 font-display text-[28px] leading-tight font-medium tracking-[-0.02em]">
          {harvests.length
            ? `${harvests.length} ${harvests.length === 1 ? "clipping" : "clippings"}, about ${grams} g`
            : "No clippings yet"}
        </h2>
        <p className="mt-2 text-[14px] text-ink-muted">
          Every “Log Harvest” lands here and resets that pot’s regrowth clock.
        </p>
      </div>
      {harvests.length ? (
        <ol className="divide-y divide-rule self-start rounded-2xl border border-rule bg-card/60">
          {harvests.slice(0, 8).map((h) => (
            <li key={h.id} className="flex animate-rise items-center gap-4 px-5 py-3 text-[14px]">
              <Scissors className="size-4 text-ink-muted" aria-hidden />
              <span className="font-semibold">{profiles[h.herbId]?.name}</span>
              <span className="text-ink-muted">cut on day {h.daysSinceLastCut}</span>
              <span className="ml-auto font-mono text-[12px] text-ink-muted">
                ~{h.estYieldGrams} g · {formatClock(h.at)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="grid place-items-center rounded-2xl border border-dashed border-rule-strong p-8 text-center text-[14px] text-ink-muted">
          Clip a herb at peak flavour and log it — your harvest history will build up here.
        </div>
      )}
    </section>
  );
}
