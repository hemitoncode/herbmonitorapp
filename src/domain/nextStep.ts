import { harvestState } from "./harvest";
import type { HerbProfile } from "./herbs";
import { quickWaterTarget } from "./watering";

/**
 * The one place that turns state into an instruction. Both the kitchen to-do
 * list and each herb card read from here, so they never disagree.
 */
export type StepKind = "cut" | "water" | "watering" | "offline" | "clip" | "wait";

export interface NextStep {
  kind: StepKind;
  /** Lower is more urgent. */
  priority: number;
  /** Imperative, e.g. "Cut Mint today". */
  title: string;
  /** Why, and what happens when you do it. */
  detail: string;
  tone: "amber" | "water" | "leaf" | "offline" | "neutral";
}

/** The slice of runtime the recommendation depends on. */
export interface StepInput {
  online: boolean;
  needsWater: boolean | null;
  valveOpen: boolean;
  autoTarget: number | null;
  moisture: number | null;
  threshold: number;
}

export function nextSteps(profile: HerbProfile, rt: StepInput): NextStep[] {
  const { name } = profile;
  const harvest = harvestState(profile);
  const steps: NextStep[] = [];

  if (!rt.online) {
    steps.push({
      kind: "offline",
      priority: 1,
      title: `Check ${name}'s pot by hand`,
      detail: "Its sensor is offline, so there is no soil reading and remote watering is unavailable.",
      tone: "offline",
    });
  } else if (rt.valveOpen) {
    steps.push({
      kind: "watering",
      priority: 1,
      title: `${name} is being watered`,
      detail:
        rt.autoTarget !== null
          ? `Stops on its own at ${Math.round(rt.autoTarget)}%. Nothing to do.`
          : "Stop it when you're happy; the node cuts off after 60 s regardless.",
      tone: "water",
    });
  } else if (rt.needsWater) {
    const target = quickWaterTarget(profile.optimalSoilMoistureMin, profile.optimalSoilMoistureMax, rt.threshold);
    steps.push({
      kind: "water",
      priority: 1,
      title: `Water ${name}`,
      detail: `Soil is ${rt.moisture?.toFixed(0) ?? "—"}%, below its ${rt.threshold}% line. One tap waters it to ${Math.round(target)}% and stops.`,
      tone: "amber",
    });
  }

  if (harvest.status === "bolting") {
    steps.push({
      kind: "cut",
      priority: 0,
      title: `Cut ${name} today`,
      detail: "It's bolting. Leaves turn bitter once it flowers. Clip it back hard, then press Log Harvest.",
      tone: "amber",
    });
  } else if (harvest.status === "peak") {
    steps.push({
      kind: "clip",
      priority: 2,
      title: `Clip ${name}`,
      detail: `Day ${profile.daysSinceLastCut} of ${profile.regrowthCycleDays}: peak flavour. Cut the top third, then press Log Harvest.`,
      tone: "leaf",
    });
  } else {
    steps.push({
      kind: "wait",
      priority: 3,
      title: `Leave ${name} to regrow`,
      detail: `Ready to clip in about ${harvest.daysUntilPeak} ${harvest.daysUntilPeak === 1 ? "day" : "days"}.`,
      tone: "neutral",
    });
  }

  return steps.sort((a, b) => a.priority - b.priority);
}

/** Everything actionable across the garden, most urgent first. "wait" steps are excluded. */
export function gardenTodo(herbs: { profile: HerbProfile; rt: StepInput }[]): (NextStep & { herbId: string })[] {
  return herbs
    .flatMap(({ profile, rt }) => nextSteps(profile, rt).map((s) => ({ ...s, herbId: profile.id })))
    .filter((s) => s.kind !== "wait")
    .sort((a, b) => a.priority - b.priority);
}
