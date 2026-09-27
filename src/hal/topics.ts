/** Topic namespace: `garden/{herbId}/...` (spec §3.1). */
export const topics = {
  telemetry: (herbId: string) => `garden/${herbId}/telemetry`,
  valveState: (herbId: string) => `garden/${herbId}/valve/state`,
  valveCommand: (herbId: string) => `garden/${herbId}/valve/command`,
  waterUsed: (herbId: string) => `garden/${herbId}/water_used`,
  /** Birth / last-will status. Not in the original spec; mirrors standard MQTT LWT practice. */
  status: (herbId: string) => `garden/${herbId}/status`,
  /** Filter for everything the garden publishes. */
  all: "garden/#",
} as const;

/** Extract `{herbId}` and the channel suffix from a garden topic. */
export function parseTopic(topic: string): { herbId: string; channel: string } | null {
  const [root, herbId, ...rest] = topic.split("/");
  if (root !== "garden" || !herbId || rest.length === 0) return null;
  return { herbId, channel: rest.join("/") };
}

export interface TelemetryPayload {
  moisture: number;
  temperature: number;
  rssi: number;
  timestamp: string;
}

export type ValvePosition = "OPEN" | "CLOSED";

export interface ValveStatePayload {
  state: ValvePosition;
  flowRateLpm: number;
  /** Simulated seconds the valve has been open in the current run. */
  runSeconds: number;
  /** Set when the on-node watchdog forced the valve shut. */
  warning?: string;
}

export interface ValveCommandPayload {
  action: "START" | "STOP";
}

export interface WaterUsedPayload {
  sessionLiters: number;
  totalLiters: number;
}

export interface StatusPayload {
  online: boolean;
}
