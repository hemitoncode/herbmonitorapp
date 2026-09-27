/** Physical constants for the virtual nodes (spec §3.2). Units are per *simulated* second. */
export const PHYSICS = {
  /** Evaporation while the valve is closed: 0.1 % per minute. */
  evaporationPerSecond: 0.1 / 60,
  /** Absorption while the valve is open: 1.2 % per second. */
  absorptionPerSecond: 1.2,
  /** Irrigation cannot push the soil above this. */
  moistureCap: 95,
  /** Calibrated flow meter rate. */
  flowRateLpm: 0.5,
  /** Watchdog closes the valve once a single run reaches this duration. */
  maxRunSeconds: 60,
  /** Std-dev of the gaussian ADC noise; clamped to ±jitterBound. */
  jitterSigma: 0.18,
  jitterBound: 0.4,
  /** Fraction of outbound telemetry dropped while the link is "lossy". */
  lossyDropRate: 0.4,
} as const;

export const WATCHDOG_WARNING = "Safety cutoff triggered: Max run duration reached";

export type Random = () => number;

/** Deterministic PRNG so tests (and bug reports) can replay a run exactly. */
export function mulberry32(seed: number): Random {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller standard normal sample. */
export function gaussian(random: Random): number {
  let u = 0;
  while (u === 0) u = random();
  const v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function sensorJitter(random: Random): number {
  const n = gaussian(random) * PHYSICS.jitterSigma;
  return Math.max(-PHYSICS.jitterBound, Math.min(PHYSICS.jitterBound, n));
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const litersForSeconds = (seconds: number) => seconds * (PHYSICS.flowRateLpm / 60);
