import { AlertTriangle, Droplet, Droplets, Scissors, Sprout, Square, WifiOff } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { HarvestCycle } from "@/components/HarvestCycle";
import { HerbIllustration } from "@/components/HerbIllustration";
import { MoistureBar } from "@/components/MoistureBar";
import { HARVEST_TONE, moistureTone, waterStatus } from "@/components/status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HARVEST_SHORT_LABEL, harvestState, type HarvestStatus } from "@/domain/harvest";
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

/** A sentence, not a dashboard: what should I do in the kitchen right now? */
function KitchenSummary() {
  // Select stable references only; derive in render so the selector never returns fresh objects.
  const { order, profiles, runtime, totalHarvests } = useGarden((s) => ({
    order: s.order,
    profiles: s.profiles,
    runtime: s.runtime,
    totalHarvests: s.totalHarvests,
  }));
  const herbs = order.map((id) => ({
    name: profiles[id]!.name,
    status: harvestState(profiles[id]!).status,
    water: waterStatus(runtime[id]!),
  }));
  const liters = order.reduce((sum, id) => sum + runtime[id]!.water.totalLiters, 0);

  const ready = herbs.filter((h) => h.status !== "regrowing");
  const urgent = herbs.filter((h) => h.status === "bolting").map((h) => h.name);
  const thirsty = herbs.filter((h) => h.water === "needs").map((h) => h.name);

  const headline =
    ready.length === 0
      ? "Nothing to clip yet — the garden is regrowing."
      : `${ready.length === herbs.length ? "Every herb is" : `${joinNames(ready.map((h) => h.name))} ${ready.length === 1 ? "is" : "are"}`} ready to clip.`;

  const notes: string[] = [];
  if (urgent.length) notes.push(`${joinNames(urgent)} ${urgent.length === 1 ? "is" : "are"} starting to bolt — cut today before the leaves turn bitter.`);
  if (thirsty.length) notes.push(`${joinNames(thirsty)} could use water.`);
  if (!notes.length) notes.push("Soil moisture is on target across the windowsill.");

  const kpis = [
    { label: "Ready to clip", value: String(ready.length), sub: `of ${herbs.length} pots` },
    { label: "Need water", value: String(thirsty.length), sub: thirsty.length ? "below threshold" : "all on target" },
    { label: "Harvests logged", value: String(totalHarvests), sub: "this session" },
    { label: "Water used", value: liters.toFixed(1), unit: "L", sub: "lifetime, all pots" },
  ];

  return (
    <section className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-end">
      <div className="animate-rise">
        <p className="eyebrow">Today at the windowsill</p>
        <h1 className="mt-3 max-w-[18ch] font-display text-[40px] leading-[1.02] font-medium tracking-[-0.025em] text-balance text-ink sm:text-[56px]">
          {headline}
        </h1>
        <p className="mt-4 max-w-[52ch] text-[16px] text-ink-soft" aria-live="polite">
          {notes.join(" ")}
        </p>
      </div>
      <dl className="grid animate-rise grid-cols-2 overflow-hidden rounded-2xl border border-rule bg-card/60 [animation-delay:120ms]">
        {kpis.map((k, i) => (
          <div key={k.label} className={cn("p-5", i % 2 === 0 && "border-r border-rule", i < 2 && "border-b border-rule")}>
            <dt className="text-[12px] font-medium text-ink-muted">{k.label}</dt>
            <dd className="mt-1">
              <span className="text-[30px] leading-none font-semibold tracking-[-0.02em] text-ink">{k.value}</span>
              {k.unit && <span className="ml-1 text-[15px] font-semibold text-ink-muted">{k.unit}</span>}
              <span className="mt-1.5 block text-[12px] text-ink-muted">{k.sub}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function HerbCard({ herbId, index }: { herbId: string; index: number }) {
  const { profile, runtime } = useHerbTelemetry(herbId);
  const harvest = harvestState(profile);
  const water = waterStatus(runtime);
  const watering = runtime.valve.state === "OPEN";
  const reading = runtime.telemetry?.moisture ?? null;
  const HarvestIcon = HARVEST_ICON[harvest.status];
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
          <span className="font-mono text-[11px] tracking-wider text-ink-muted">No. {String(index + 1).padStart(2, "0")}</span>
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
            <span className="tabular font-mono font-semibold text-ink">{reading === null ? "—" : `${reading.toFixed(1)}%`}</span>
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
          <h2 id={`herb-${herbId}-name`} className="font-display text-[34px] leading-none font-medium tracking-[-0.02em] text-ink">
            {profile.name}
          </h2>
          <p className="mt-1 font-display text-[18px] text-ink-muted italic">{profile.variety}</p>
          <p className={cn("mt-3 text-[13px] font-semibold", harvest.status === "bolting" ? "text-amber-deep" : harvest.status === "peak" ? "text-leaf-deep" : "text-ink-soft")}>
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

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Button variant={harvest.status === "regrowing" ? "outline" : "primary"} onClick={onHarvest}>
            <Scissors aria-hidden />
            Log Harvest
          </Button>
          {watering ? (
            <Button variant="stop" onClick={() => actions().stopWatering(herbId)}>
              <Square aria-hidden className="fill-current" />
              {runtime.autoTarget !== null ? `Watering to ${Math.round(runtime.autoTarget)}%` : "Stop watering"}
            </Button>
          ) : (
            water === "needs" && (
              <Button variant="water" onClick={() => actions().quickWater(herbId)}>
                <Droplet aria-hidden />
                Quick water
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
    </article>
  );
}

function HarvestJournal() {
  const { harvests, profiles } = useGarden((s) => ({ harvests: s.harvests, profiles: s.profiles }));
  const grams = harvests.reduce((sum, h) => sum + h.estYieldGrams, 0);
  return (
    <section aria-labelledby="journal-title" className="grid gap-6 border-t border-rule pt-10 lg:grid-cols-[1fr_2fr]">
      <div>
        <p className="eyebrow">Kitchen journal</p>
        <h2 id="journal-title" className="mt-2 font-display text-[28px] leading-tight font-medium tracking-[-0.02em]">
          {harvests.length ? `${harvests.length} ${harvests.length === 1 ? "clipping" : "clippings"}, about ${grams} g` : "No clippings yet"}
        </h2>
        <p className="mt-2 text-[14px] text-ink-muted">Every “Log Harvest” lands here and resets that pot’s regrowth clock.</p>
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
