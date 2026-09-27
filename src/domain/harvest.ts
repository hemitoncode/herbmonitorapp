import type { HerbProfile } from "./herbs";

export type HarvestStatus = "regrowing" | "peak" | "bolting";

export const PEAK_START_RATIO = 0.7;
export const BOLTING_RATIO = 1.3;

export interface HarvestState {
  status: HarvestStatus;
  /** Day the peak window opens (cycle × 0.7). */
  peakStartDay: number;
  /** Day bolting risk begins (cycle × 1.3). */
  boltingDay: number;
  /** Whole days until the peak window opens; 0 once it has. */
  daysUntilPeak: number;
  label: string;
}

export function harvestState(
  profile: Pick<HerbProfile, "regrowthCycleDays" | "daysSinceLastCut">,
): HarvestState {
  const { regrowthCycleDays: cycle, daysSinceLastCut: days } = profile;
  const peakStartDay = cycle * PEAK_START_RATIO;
  const boltingDay = cycle * BOLTING_RATIO;

  if (days >= boltingDay) {
    return {
      status: "bolting",
      peakStartDay,
      boltingDay,
      daysUntilPeak: 0,
      label: "Harvest Urgently (Bolting Risk)",
    };
  }
  if (days >= peakStartDay) {
    return {
      status: "peak",
      peakStartDay,
      boltingDay,
      daysUntilPeak: 0,
      label: "Ready to Clip (Peak Flavor)",
    };
  }
  const daysUntilPeak = Math.ceil(peakStartDay - days);
  return {
    status: "regrowing",
    peakStartDay,
    boltingDay,
    daysUntilPeak,
    label: `Regrowing — Est. ${daysUntilPeak} ${daysUntilPeak === 1 ? "day" : "days"} until harvest`,
  };
}

export const HARVEST_SHORT_LABEL: Record<HarvestStatus, string> = {
  regrowing: "Regrowing",
  peak: "Ready to clip",
  bolting: "Bolting risk",
};
