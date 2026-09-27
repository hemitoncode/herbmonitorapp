import { describe, expect, it, vi } from "vitest";
import { InMemoryMqttBus, topicMatches } from "./bus";

describe("topicMatches", () => {
  it.each([
    ["garden/basil/telemetry", "garden/basil/telemetry", true],
    ["garden/+/telemetry", "garden/mint/telemetry", true],
    ["garden/+/telemetry", "garden/mint/valve/state", false],
    ["garden/#", "garden/mint/valve/state", true],
    ["garden/#", "garden", true],
    ["garden/basil/#", "garden/mint/telemetry", false],
    ["garden/+", "garden/basil/telemetry", false],
    ["garden/basil/telemetry", "garden/basil", false],
  ])("%s vs %s → %s", (filter, topic, expected) => {
    expect(topicMatches(filter, topic)).toBe(expected);
  });
});

describe("InMemoryMqttBus", () => {
  it("delivers to matching subscribers only", () => {
    const bus = new InMemoryMqttBus();
    const basil = vi.fn();
    const all = vi.fn();
    bus.subscribe("garden/basil/#", basil);
    bus.subscribe("garden/#", all);
    bus.publish("garden/mint/telemetry", { moisture: 40 });
    expect(basil).not.toHaveBeenCalled();
    expect(all).toHaveBeenCalledTimes(1);
  });

  it("replays retained messages to late subscribers", () => {
    const bus = new InMemoryMqttBus();
    bus.publish("garden/basil/valve/state", { state: "OPEN" }, { retain: true });
    bus.publish("garden/basil/telemetry", { moisture: 1 });
    const handler = vi.fn();
    bus.subscribe("garden/basil/#", handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0]).toMatchObject({
      payload: { state: "OPEN" },
      retained: true,
    });
  });

  it("stops delivering after unsubscribe", () => {
    const bus = new InMemoryMqttBus();
    const handler = vi.fn();
    const off = bus.subscribe("garden/#", handler);
    off();
    bus.publish("garden/basil/telemetry", {});
    expect(handler).not.toHaveBeenCalled();
  });

  it("isolates a throwing subscriber", () => {
    const bus = new InMemoryMqttBus();
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const ok = vi.fn();
    bus.subscribe("garden/#", () => {
      throw new Error("boom");
    });
    bus.subscribe("garden/#", ok);
    bus.publish("garden/basil/telemetry", {});
    expect(ok).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });

  it("rejects wildcards in publish topics", () => {
    const bus = new InMemoryMqttBus();
    expect(() => bus.publish("garden/+/telemetry", {})).toThrow();
  });
});
