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
