import { describe, expect, it } from "vitest";
import { HERB_SEEDS } from "@/domain/herbs";
import { VirtualNodeEngine } from "@/engine/engine";
import { InMemoryMqttBus } from "@/hal/bus";
import { createGardenStore } from "./gardenStore";

function setup() {
  const bus = new InMemoryMqttBus();
  const engine = new VirtualNodeEngine({
    transport: bus,
    nodes: HERB_SEEDS.map((s) => ({
      herbId: s.profile.id,
      moisture: s.initialMoisture,
      totalLiters: s.lifetimeLiters,
    })),
    seed: 7,
  });
  const store = createGardenStore({
    transport: bus,
    simulator: engine,
    seeds: HERB_SEEDS,
  });
  engine.boot();
  store.flush();
  const tick = (seconds = 1) => {
    for (let i = 0; i < seconds; i++) {
      engine.step(1);
      store.flush();
      store.flush(); // pick up anything a controller published during the first flush
    }
  };
  const basil = () => store.getState().runtime.basil!;
  return { store, engine, tick, basil, act: store.getState() };
}

describe("spec §6 demo walkthrough", () => {
  it("runs end to end", () => {
    const { store, tick, basil, act } = setup();

    // 1. Initial state
    expect(basil().telemetry!.moisture).toBeCloseTo(42, 0);
    expect(basil().threshold).toBe(30);
    expect(basil().needsWater).toBe(false);

    // 2. Moisture drop via the dev harness
    act.forceMoisture("basil", 24);
    store.flush();
    expect(basil().needsWater).toBe(true);

    // 3. Actuation
    act.startWatering("basil");
    store.flush();
    expect(basil().valve).toMatchObject({ state: "OPEN", flowRateLpm: 0.5 });
    tick(3);
    expect(basil().water.sessionLiters).toBeCloseTo(0.025, 6);
    expect(basil().telemetry!.moisture).toBeGreaterThan(26);

    // 4. Threshold crossed (≈ 24 + 1.2 × 6 = 31.2 %)
    tick(3);
    expect(basil().needsWater).toBe(false);

    // 5. Stop
    const lifetimeBefore = basil().water.totalLiters;
    const session = basil().water.sessionLiters;
    act.stopWatering("basil");
    store.flush();
    expect(basil().valve).toMatchObject({ state: "CLOSED", flowRateLpm: 0 });
    expect(basil().water.totalLiters).toBeCloseTo(lifetimeBefore + session, 6);
  });
});

describe("garden store", () => {
  it("threshold slider immediately recalculates the recommendation", () => {
    const { store, basil } = setup();
    store.getState().setThreshold("basil", 50);
    expect(basil().needsWater).toBe(true);
    store.getState().setThreshold("basil", 20);
    expect(basil().needsWater).toBe(false);
  });

  it("quick water closes the valve on its own at the optimal midpoint", () => {
    const { store, tick } = setup();
    const mint = () => store.getState().runtime.mint!;
    expect(mint().needsWater).toBe(true);
    store.getState().quickWater("mint");
    store.flush();
    expect(mint().valve.state).toBe("OPEN");
    expect(mint().autoTarget).toBe(55);
    tick(20);
    expect(mint().valve.state).toBe("CLOSED");
    expect(mint().autoTarget).toBeNull();
    expect(mint().telemetry!.moisture).toBeGreaterThanOrEqual(55);
    expect(mint().telemetry!.moisture).toBeLessThan(58);
    expect(mint().runs[0]).toMatchObject({ cause: "target" });
  });

  it("records completed runs with their cause", () => {
    const { store, tick, basil } = setup();
    store.getState().startWatering("basil");
    store.flush();
    tick(10);
    store.getState().stopWatering("basil");
    store.flush();
    expect(basil().runs[0]).toMatchObject({ cause: "manual", seconds: 10 });
    expect(basil().runs[0]!.liters).toBeCloseTo(10 / 120, 6);
    store.getState().startWatering("basil");
    store.flush();
    tick(60);
    expect(basil().runs[0]).toMatchObject({ cause: "watchdog", seconds: 60 });
    expect(basil().runs).toHaveLength(2);
  });

  it("tracks online status via the last-will topic", () => {
    const { store, basil } = setup();
    expect(basil().online).toBe(true);
    store.getState().setLink("basil", "offline");
    store.flush();
    expect(basil().online).toBe(false);
    store.getState().setLink("basil", "online");
    store.flush();
    expect(basil().online).toBe(true);
  });

  it("logs outbound commands alongside inbound telemetry", () => {
    const { store, basil } = setup();
    store.getState().startWatering("basil");
    store.flush();
    const out = basil().log.filter((e) => e.direction === "out");
    expect(out.at(-1)).toMatchObject({
      topic: "garden/basil/valve/command",
      payload: '{"action":"START"}',
    });
  });
});
