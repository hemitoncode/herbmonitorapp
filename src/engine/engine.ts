import type { TelemetryTransport } from "@/hal/transport";
import { mulberry32, type Random } from "./physics";
import { VirtualNode, type LinkMode } from "./virtualNode";

export type SimSpeed = 1 | 5 | 20;
export const SIM_SPEEDS: SimSpeed[] = [1, 5, 20];

export interface NodeSeed {
  herbId: string;
  moisture: number;
  totalLiters: number;
}

export interface EngineOptions {
  transport: TelemetryTransport;
  nodes: NodeSeed[];
  seed?: number;
  random?: Random;
  /** Real-time interval of one tick at 1× speed. */
  baseTickMs?: number;
}

/**
 * Drives every virtual node on a shared simulated clock.
 *
 * Each tick advances the simulation by exactly one simulated second. The speed
 * multiplier shortens the real interval between ticks (1000 ms at 1×, 50 ms at
 * 20×), so all physics — drying, absorption, flow metering and the watchdog —
 * stay on one consistent clock and motion stays smooth at every speed.
 */
export class VirtualNodeEngine {
  readonly nodes = new Map<string, VirtualNode>();
  speed: SimSpeed = 1;
  simTimeMs: number;

  private baseTickMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: EngineOptions) {
    const random = options.random ?? mulberry32(options.seed ?? 0x5eed);
    this.baseTickMs = options.baseTickMs ?? 1000;
    this.simTimeMs = Date.now();
    for (const seed of options.nodes) {
      this.nodes.set(
        seed.herbId,
        new VirtualNode({
          herbId: seed.herbId,
          moisture: seed.moisture,
          totalLiters: seed.totalLiters,
          transport: options.transport,
          random,
          simNow: () => this.simTimeMs,
        }),
      );
    }
  }

  /** Publish every node's birth message and current state. Call once subscribers are attached. */
  boot() {
    for (const node of this.nodes.values()) node.boot();
  }

  get running() {
    return this.timer !== null;
  }

  get tickIntervalMs() {
    return this.baseTickMs / this.speed;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.step(), this.tickIntervalMs);
  }

  stop() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  setSpeed(speed: SimSpeed) {
    this.speed = speed;
    if (this.running) {
      this.stop();
      this.start();
    }
  }

  /** Advance every node by `seconds` simulated seconds, one second at a time. */
  step(seconds = 1) {
    for (let i = 0; i < seconds; i++) {
      this.simTimeMs += 1000;
      for (const node of this.nodes.values()) node.tick(1);
    }
  }

  forceMoisture(herbId: string, value: number) {
    this.node(herbId).forceMoisture(value);
  }

  setLink(herbId: string, mode: LinkMode) {
    this.node(herbId).setLink(mode);
  }

  dispose() {
    this.stop();
    for (const node of this.nodes.values()) node.dispose();
    this.nodes.clear();
  }

  private node(herbId: string) {
    const node = this.nodes.get(herbId);
    if (!node) throw new Error(`Unknown node: ${herbId}`);
    return node;
  }
}
