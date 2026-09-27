/**
 * Half-width of the deadband around the threshold. The sensor jitters by up to
 * ±0.4 %, so a raw `reading < threshold` comparison would flap for minutes while
 * the soil slowly dries through the threshold. A ±0.5 % band (1 % wide) is wider
 * than the worst-case noise spread (0.8 %), so the recommendation is stable.
 */
export const WATERING_DEADBAND = 0.5;

/**
 * Watering recommendation with hysteresis.
 * - Starts recommending water once the reading drops below `threshold − band`.
 * - Stops once the reading climbs to `threshold + band` or above.
 * - Inside the band the previous decision holds.
 * With no previous decision the raw comparison is used.
 */
export function needsWater(
  reading: number,
  threshold: number,
  previous: boolean | null,
  band = WATERING_DEADBAND,
): boolean {
  if (previous === null) return reading < threshold;
  if (reading < threshold - band) return true;
  if (reading >= threshold + band) return false;
  return previous;
}

/** Where a one-tap "quick water" run stops: the middle of the optimal band, never below threshold + 2 %. */
export function quickWaterTarget(min: number, max: number, threshold: number): number {
  return Math.min(95, Math.max((min + max) / 2, threshold + 2));
}

/** The slice of runtime the advice depends on. */
export interface AdviceInput {
  online: boolean;
  needsWater: boolean | null;
  valveOpen: boolean;
  autoTarget: number | null;
  moisture: number | null;
  threshold: number;
}

export type AdviceKind = "offline" | "pending" | "watering" | "water" | "ok";

export interface Advice {
  kind: AdviceKind;
  /** Imperative or status, e.g. "Water Mint". */
  title: string;
  /** Why, and what happens next. */
  detail: string;
  tone: "amber" | "water" | "leaf" | "offline" | "neutral";
}

/**
 * The one place that turns state into an instruction. The garden headline,
 * each card and the telemetry banner all read from here, so they never disagree.
 */
export function wateringAdvice(
  profile: { name: string; optimalSoilMoistureMin: number; optimalSoilMoistureMax: number },
  rt: AdviceInput,
): Advice {
  const { name } = profile;
  const pct = rt.moisture === null ? "—" : `${rt.moisture.toFixed(0)}%`;
  if (!rt.online) {
    return {
      kind: "offline",
      title: `Check ${name} by hand`,
      detail: "Its sensor is offline: no soil reading, and the valve can't be commanded.",
      tone: "offline",
    };
  }
  if (rt.needsWater === null) {
    return { kind: "pending", title: `Waiting for ${name}`, detail: "No telemetry packet yet.", tone: "neutral" };
  }
  if (rt.valveOpen) {
    return {
      kind: "watering",
      title: `Watering ${name}`,
      detail:
        rt.autoTarget !== null
          ? `Stops on its own at ${Math.round(rt.autoTarget)}%. Nothing to do.`
          : "Stop it when you like; the node cuts off after 60 s regardless.",
      tone: "water",
    };
  }
  if (rt.needsWater) {
    const target = quickWaterTarget(profile.optimalSoilMoistureMin, profile.optimalSoilMoistureMax, rt.threshold);
    return {
      kind: "water",
      title: `Water ${name}`,
      detail: `Soil is ${pct}, below its ${rt.threshold}% line. One tap waters it to ${Math.round(target)}% and stops.`,
      tone: "amber",
    };
  }
  return {
    kind: "ok",
    title: `${name} is fine`,
    detail: `Soil is ${pct}, above its ${rt.threshold}% line. Nothing to do.`,
    tone: "leaf",
  };
}
