import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { HERB_SEEDS } from "@/domain/herbs";
import { VirtualNodeEngine } from "@/engine/engine";
import { InMemoryMqttBus } from "@/hal/bus";
import { createGardenStore, type GardenState } from "./gardenStore";

/**
 * App wiring. To run against real hardware, replace `InMemoryMqttBus` with an
 * adapter implementing `TelemetryTransport` over MQTT.js and drop the engine.
 */
const bus = new InMemoryMqttBus();

const engine = new VirtualNodeEngine({
  transport: bus,
  nodes: HERB_SEEDS.map((s) => ({
    herbId: s.profile.id,
    moisture: s.initialMoisture,
    totalLiters: s.lifetimeLiters,
  })),
  seed: Date.now(),
});

export const gardenStore = createGardenStore({ transport: bus, simulator: engine, seeds: HERB_SEEDS });

engine.boot();
engine.start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    engine.dispose();
    gardenStore.dispose();
  });
}

export const getTickIntervalMs = () => engine.tickIntervalMs;

export function useGarden<T>(selector: (state: GardenState) => T): T {
  return useStore(gardenStore, useShallow(selector));
}

/** Everything a herb view needs: profile + live runtime. */
export function useHerbTelemetry(herbId: string) {
  return useGarden((s) => ({ profile: s.profiles[herbId]!, runtime: s.runtime[herbId]! }));
}

export const actions = () => gardenStore.getState();
