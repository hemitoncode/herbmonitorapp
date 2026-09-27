import { describe, expect, it } from "vitest";
import { InMemoryMqttBus } from "@/hal/bus";
import { topics, type TelemetryPayload, type ValveStatePayload, type WaterUsedPayload } from "@/hal/topics";
import type { BusMessage } from "@/hal/transport";
import { VirtualNodeEngine } from "./engine";
import { PHYSICS, WATCHDOG_WARNING } from "./physics";

function setup(moisture = 42, totalLiters = 10) {
  const bus = new InMemoryMqttBus();
  const messages: BusMessage[] = [];
  bus.subscribe("garden/#", (m) => messages.push(m));
  const engine = new VirtualNodeEngine({
    transport: bus,
    nodes: [{ herbId: "basil", moisture, totalLiters }],
    seed: 42,
  });
  engine.boot();
  const node = engine.nodes.get("basil")!;
  const last = <T>(topic: string) =>
    [...messages].reverse().find((m) => m.topic === topic)?.payload as T | undefined;
  const command = (action: "START" | "STOP") => bus.publish(topics.valveCommand("basil"), { action });
  return { bus, engine, node, messages, last, command };
}

describe("VirtualNode physics", () => {
  it("dries at 0.1 % per simulated minute with the valve closed", () => {
    const { engine, node } = setup(42);
    engine.step(600);
    expect(node.moisture).toBeCloseTo(42 - 1, 6);
  });

  it("absorbs 1.2 % per second while watering, capped at 95 %", () => {
    const { engine, node, command } = setup(24);
    command("START");
    engine.step(5);
    expect(node.moisture).toBeCloseTo(30, 6);
    node.moisture = 94.5;
    engine.step(2);
    expect(node.moisture).toBe(PHYSICS.moistureCap);
  });

  it("keeps reported moisture within ±0.45 % of the true value (±0.4 jitter + 0.1 rounding)", () => {
    const { engine, node, messages } = setup(50);
    for (let i = 0; i < 500; i++) {
      engine.step(1);
      const reading = (messages.at(-1)!.payload as TelemetryPayload).moisture;
      expect(Math.abs(reading - node.moisture)).toBeLessThanOrEqual(0.45 + 1e-9);
    }
  });

  it("meters flow at 0.5 L/min and commits the session to the total on stop", () => {
    const { engine, last, command } = setup(20, 10);
    command("START");
    engine.step(12);
    expect(last<WaterUsedPayload>(topics.waterUsed("basil"))!.sessionLiters).toBeCloseTo(0.1, 6);
    expect(last<WaterUsedPayload>(topics.waterUsed("basil"))!.totalLiters).toBe(10);
    command("STOP");
    const used = last<WaterUsedPayload>(topics.waterUsed("basil"))!;
    expect(used.totalLiters).toBeCloseTo(10.1, 6);
    expect(last<ValveStatePayload>(topics.valveState("basil"))).toMatchObject({ state: "CLOSED", flowRateLpm: 0 });
  });

  it("watchdog closes the valve after 60 s and flags a warning", () => {
    const { engine, node, last, command } = setup(10);
    command("START");
    engine.step(59);
    expect(node.valveOpen).toBe(true);
    engine.step(1);
    expect(node.valveOpen).toBe(false);
    const state = last<ValveStatePayload>(topics.valveState("basil"))!;
    expect(state).toMatchObject({ state: "CLOSED", warning: WATCHDOG_WARNING });
    expect(node.totalLiters).toBeCloseTo(10 + 0.5, 6);
    // The warning clears on the next run.
    command("START");
    expect(last<ValveStatePayload>(topics.valveState("basil"))!.warning).toBeUndefined();
  });

  it("ignores duplicate START and stray STOP commands", () => {
    const { engine, node, command } = setup(20);
    command("STOP");
    expect(node.valveOpen).toBe(false);
    command("START");
    engine.step(10);
    command("START");
    expect(node.runSeconds).toBe(10);
  });

  it("goes silent and deaf when offline, keeps the watchdog running, and re-announces on reconnect", () => {
    const { engine, node, messages, last, command } = setup(20);
    command("START");
    engine.setLink("basil", "offline");
    expect(last<{ online: boolean }>(topics.status("basil"))).toEqual({ online: false });
    const count = messages.length;
    command("STOP"); // never arrives
    engine.step(60);
    expect(messages.length).toBe(count + 1); // only the STOP command itself
    expect(node.valveOpen).toBe(false); // on-device watchdog still fired
    engine.setLink("basil", "online");
    expect(last<{ online: boolean }>(topics.status("basil"))).toEqual({ online: true });
    expect(last<ValveStatePayload>(topics.valveState("basil"))!.warning).toBe(WATCHDOG_WARNING);
  });

  it("drops a share of telemetry on a lossy link but never state updates", () => {
    const { engine, messages, command } = setup(20);
    engine.setLink("basil", "lossy");
    command("START");
    const before = messages.length;
    engine.step(50);
    const batch = messages.slice(before);
    const telemetry = batch.filter((m) => m.topic === topics.telemetry("basil")).length;
    const valve = batch.filter((m) => m.topic === topics.valveState("basil")).length;
    expect(valve).toBe(50);
    expect(telemetry).toBeGreaterThan(15);
    expect(telemetry).toBeLessThan(45);
  });

  it("forceMoisture sets the true value and physics continue from it", () => {
    const { engine, node, command } = setup(42);
    engine.forceMoisture("basil", 24);
    expect(node.moisture).toBe(24);
    command("START");
    engine.step(1);
    expect(node.moisture).toBeCloseTo(25.2, 6);
  });

  it("speed multiplier shortens the real tick interval", () => {
    const { engine } = setup();
    expect(engine.tickIntervalMs).toBe(1000);
    engine.setSpeed(20);
    expect(engine.tickIntervalMs).toBe(50);
  });
});
