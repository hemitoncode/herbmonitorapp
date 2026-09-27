import type { BadgeTone } from "@/components/ui/badge";
import type { AdviceInput } from "@/domain/watering";
import type { HerbRuntime } from "@/store/gardenStore";

export type WaterStatus = "offline" | "pending" | "needs" | "ok";

export function waterStatus(rt: HerbRuntime): WaterStatus {
  if (!rt.online) return "offline";
  if (rt.needsWater === null) return "pending";
  return rt.needsWater ? "needs" : "ok";
}

export const WATER_COPY: Record<WaterStatus, { title: string; tone: BadgeTone }> = {
  needs: { title: "Ready for Water", tone: "amber" },
  ok: { title: "No Water Needed", tone: "leaf" },
  offline: { title: "Sensor Offline", tone: "offline" },
  pending: { title: "Waiting for Reading", tone: "neutral" },
};

/** Colour of a moisture mark: flow beats recommendation, offline beats both. */
export function moistureTone(rt: HerbRuntime): "water" | "amber" | "leaf" | "offline" {
  if (!rt.online) return "offline";
  if (rt.valve.state === "OPEN") return "water";
  return rt.needsWater ? "amber" : "leaf";
}

export const adviceInput = (rt: HerbRuntime): AdviceInput => ({
  online: rt.online,
  needsWater: rt.needsWater,
  valveOpen: rt.valve.state === "OPEN",
  autoTarget: rt.autoTarget,
  moisture: rt.telemetry?.moisture ?? null,
  threshold: rt.threshold,
});
