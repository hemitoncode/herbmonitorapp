import { createStore, type StoreApi } from "zustand/vanilla";
import type { HerbProfile, HerbSeed } from "@/domain/herbs";
import { needsWater, quickWaterTarget } from "@/domain/watering";
import type { SimSpeed } from "@/engine/engine";
import { litersForSeconds } from "@/engine/physics";
import type { LinkMode } from "@/engine/virtualNode";
import {
  parseTopic,
  topics,
  type StatusPayload,
  type TelemetryPayload,
  type ValveCommandPayload,
  type ValveStatePayload,
  type WaterUsedPayload,
} from "@/hal/topics";
import type { BusMessage, TelemetryTransport } from "@/hal/transport";

export const HISTORY_LENGTH = 120;
export const LOG_LENGTH = 12;

export interface MoisturePoint {
  /** Simulated time (ms since epoch) from the telemetry timestamp. */
  t: number;
  moisture: number;
}

export interface LogEntry {
  id: number;
  topic: string;
  payload: string;
  receivedAt: number;
  direction: "in" | "out";
}

export interface RunRecord {
  id: number;
  endedAt: number;
  seconds: number;
  liters: number;
  cause: "manual" | "target" | "watchdog";
}

export interface HerbRuntime {
  telemetry: TelemetryPayload | null;
  history: MoisturePoint[];
  valve: ValveStatePayload;
  water: WaterUsedPayload;
  online: boolean;
  /** Wall-clock ms of the last telemetry packet. */
  lastPacketAt: number | null;
  threshold: number;
  /** null until the first reading arrives. */
  needsWater: boolean | null;
  /** Set during a one-tap "quick water" run: the app closes the valve at this reading. */
  autoTarget: number | null;
  log: LogEntry[];
  /** Most recent completed valve runs, newest first. */
  runs: RunRecord[];
}

export const RUNS_LENGTH = 4;

export interface HarvestEvent {
  id: string;
  herbId: string;
  at: number;
  daysSinceLastCut: number;
  estYieldGrams: number;
}

export type View = "kitchen" | "telemetry";

/** The slice of the virtual node engine the dev harness is allowed to touch. */
export interface Simulator {
  setSpeed(speed: SimSpeed): void;
  forceMoisture(herbId: string, value: number): void;
  setLink(herbId: string, mode: LinkMode): void;
  readonly tickIntervalMs: number;
}

export interface GardenState {
  order: string[];
  profiles: Record<string, HerbProfile>;
  runtime: Record<string, HerbRuntime>;
  harvests: HarvestEvent[];
  totalHarvests: number;
  messageCount: number;

  view: View;
  selectedHerbId: string;
  drawerOpen: boolean;
  speed: SimSpeed;
  links: Record<string, LinkMode>;

  setView(view: View): void;
  selectHerb(herbId: string): void;
  setDrawerOpen(open: boolean): void;
  setThreshold(herbId: string, threshold: number): void;
  startWatering(herbId: string): void;
  stopWatering(herbId: string): void;
  quickWater(herbId: string): void;
  logHarvest(herbId: string): void;
  advanceDays(days: number): void;
  forceMoisture(herbId: string, value: number): void;
  setSpeed(speed: SimSpeed): void;
  setLink(herbId: string, mode: LinkMode): void;
}

export interface GardenStore extends StoreApi<GardenState> {
  /** Apply any queued bus messages synchronously (tests; normally a microtask does this). */
  flush(): void;
  dispose(): void;
}

let logSeq = 0;

function logEntry(topic: string, payload: unknown, receivedAt: number, direction: LogEntry["direction"]): LogEntry {
  return { id: ++logSeq, topic, payload: JSON.stringify(payload), receivedAt, direction };
}

function pushCapped<T>(list: T[], item: T, cap: number): T[] {
  const next = list.length >= cap ? list.slice(list.length - cap + 1) : list.slice();
  next.push(item);
  return next;
}

function initialRuntime(seed: HerbSeed): HerbRuntime {
  return {
    telemetry: null,
    history: [],
    valve: { state: "CLOSED", flowRateLpm: 0, runSeconds: 0 },
    water: { sessionLiters: 0, totalLiters: seed.lifetimeLiters },
    online: false,
    lastPacketAt: null,
    threshold: seed.profile.optimalSoilMoistureMin,
    needsWater: null,
    autoTarget: null,
    log: [],
    runs: [],
  };
}

function applyMessage(rt: HerbRuntime, channel: string, message: BusMessage): HerbRuntime {
  const log = pushCapped(rt.log, logEntry(message.topic, message.payload, message.receivedAt, "in"), LOG_LENGTH);
  switch (channel) {
    case "telemetry": {
      const telemetry = message.payload as TelemetryPayload;
      const point = { t: Date.parse(telemetry.timestamp), moisture: telemetry.moisture };
      return {
        ...rt,
        log,
        telemetry,
        online: true,
        lastPacketAt: message.receivedAt,
        history: pushCapped(rt.history, point, HISTORY_LENGTH),
        needsWater: needsWater(telemetry.moisture, rt.threshold, rt.needsWater),
      };
    }
    case "valve/state": {
      const valve = message.payload as ValveStatePayload;
      let runs = rt.runs;
      if (rt.valve.state === "OPEN" && valve.state === "CLOSED") {
        const run: RunRecord = {
          id: message.receivedAt + Math.random(),
          endedAt: message.receivedAt,
          seconds: valve.runSeconds,
          liters: litersForSeconds(valve.runSeconds),
          cause: valve.warning ? "watchdog" : rt.autoTarget !== null ? "target" : "manual",
        };
        runs = [run, ...rt.runs].slice(0, RUNS_LENGTH);
      }
      return { ...rt, log, valve, runs, autoTarget: valve.state === "OPEN" ? rt.autoTarget : null };
    }
    case "water_used":
      return { ...rt, log, water: message.payload as WaterUsedPayload };
    case "status":
      return { ...rt, log, online: (message.payload as StatusPayload).online };
    default:
      return { ...rt, log };
  }
}

export function createGardenStore(options: {
  transport: TelemetryTransport;
  simulator: Simulator;
  seeds: HerbSeed[];
}): GardenStore {
  const { transport, simulator, seeds } = options;

  const publishCommand = (herbId: string, action: ValveCommandPayload["action"]) => {
    const topic = topics.valveCommand(herbId);
    const payload: ValveCommandPayload = { action };
    // Record outbound commands in the herb's log before the node reacts to them.
    store.setState((s) => {
      const rt = s.runtime[herbId];
      if (!rt) return s;
      return {
        runtime: {
          ...s.runtime,
          [herbId]: { ...rt, log: pushCapped(rt.log, logEntry(topic, payload, Date.now(), "out"), LOG_LENGTH) },
        },
      };
    });
    transport.publish(topic, payload);
  };

  const store = createStore<GardenState>()((set, get) => ({
    order: seeds.map((s) => s.profile.id),
    profiles: Object.fromEntries(seeds.map((s) => [s.profile.id, { ...s.profile }])),
    runtime: Object.fromEntries(seeds.map((s) => [s.profile.id, initialRuntime(s)])),
    harvests: [],
    totalHarvests: 0,
    messageCount: 0,

    view: "kitchen",
    selectedHerbId: seeds[0]?.profile.id ?? "",
    drawerOpen: false,
    speed: 1,
    links: Object.fromEntries(seeds.map((s) => [s.profile.id, "online" as LinkMode])),

    setView: (view) => set({ view }),
    selectHerb: (selectedHerbId) => set({ selectedHerbId }),
    setDrawerOpen: (drawerOpen) => set({ drawerOpen }),

    setThreshold: (herbId, threshold) =>
      set((s) => {
        const rt = s.runtime[herbId];
        if (!rt) return s;
        const reading = rt.telemetry?.moisture;
        return {
          runtime: {
            ...s.runtime,
            [herbId]: {
              ...rt,
              threshold,
              needsWater: reading === undefined ? rt.needsWater : needsWater(reading, threshold, rt.needsWater),
            },
          },
        };
      }),

    startWatering: (herbId) => publishCommand(herbId, "START"),

    stopWatering: (herbId) => {
      set((s) => {
        const rt = s.runtime[herbId];
        return rt ? { runtime: { ...s.runtime, [herbId]: { ...rt, autoTarget: null } } } : s;
      });
      publishCommand(herbId, "STOP");
    },

    quickWater: (herbId) => {
      const { profiles, runtime } = get();
      const profile = profiles[herbId];
      const rt = runtime[herbId];
      if (!profile || !rt) return;
      const target = quickWaterTarget(profile.optimalSoilMoistureMin, profile.optimalSoilMoistureMax, rt.threshold);
      set((s) => ({ runtime: { ...s.runtime, [herbId]: { ...rt, autoTarget: target } } }));
      publishCommand(herbId, "START");
    },

    logHarvest: (herbId) =>
      set((s) => {
        const profile = s.profiles[herbId];
        if (!profile) return s;
        const event: HarvestEvent = {
          id: `${herbId}-${Date.now()}-${s.totalHarvests}`,
          herbId,
          at: Date.now(),
          daysSinceLastCut: profile.daysSinceLastCut,
          estYieldGrams: profile.estYieldGrams,
        };
        return {
          profiles: { ...s.profiles, [herbId]: { ...profile, daysSinceLastCut: 0 } },
          harvests: [event, ...s.harvests],
          totalHarvests: s.totalHarvests + 1,
        };
      }),

    advanceDays: (days) =>
      set((s) => ({
        profiles: Object.fromEntries(
          Object.entries(s.profiles).map(([id, p]) => [id, { ...p, daysSinceLastCut: p.daysSinceLastCut + days }]),
        ),
      })),

    forceMoisture: (herbId, value) => simulator.forceMoisture(herbId, value),

    setSpeed: (speed) => {
      simulator.setSpeed(speed);
      set({ speed });
    },

    setLink: (herbId, mode) => {
      simulator.setLink(herbId, mode);
      set((s) => ({ links: { ...s.links, [herbId]: mode } }));
    },
  }));

  // Batch bus traffic: one tick publishes many messages; apply them in one render.
  let queue: BusMessage[] = [];
  let scheduled = false;

  const flush = () => {
    scheduled = false;
    if (queue.length === 0) return;
    const batch = queue;
    queue = [];

    store.setState((s) => {
      const runtime = { ...s.runtime };
      for (const message of batch) {
        const parsed = parseTopic(message.topic);
        if (!parsed) continue;
        const rt = runtime[parsed.herbId];
        if (!rt) continue;
        // Our own outbound commands are already logged by publishCommand.
        if (parsed.channel === "valve/command") continue;
        runtime[parsed.herbId] = applyMessage(rt, parsed.channel, message);
      }
      return { runtime, messageCount: s.messageCount + batch.length };
    });

    // Quick-water controller: close the valve once the target reading is reached.
    for (const [herbId, rt] of Object.entries(store.getState().runtime)) {
      if (rt.autoTarget === null || rt.valve.state !== "OPEN" || !rt.telemetry) continue;
      // Publish directly (not via stopWatering) so the run is attributed to the target, not a manual stop.
      if (rt.telemetry.moisture >= rt.autoTarget) publishCommand(herbId, "STOP");
    }
  };

  const unsubscribe = transport.subscribe(topics.all, (message) => {
    queue.push(message);
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(flush);
    }
  });

  return Object.assign(store, {
    flush,
    dispose: unsubscribe,
  });
}
