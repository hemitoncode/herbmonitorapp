import { topics } from "@/hal/topics";
import type {
  StatusPayload,
  TelemetryPayload,
  ValveCommandPayload,
  ValveStatePayload,
  WaterUsedPayload,
} from "@/hal/topics";
import type { TelemetryTransport } from "@/hal/transport";
import { PHYSICS, WATCHDOG_WARNING, clamp, litersForSeconds, sensorJitter, type Random } from "./physics";

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits;

export type LinkMode = "online" | "lossy" | "offline";

export interface VirtualNodeOptions {
  herbId: string;
  moisture: number;
  totalLiters: number;
  transport: TelemetryTransport;
  random: Random;
  /** Simulated wall clock, used for telemetry timestamps. */
  simNow: () => number;
}

/**
 * A simulated ESP32-class soil node: capacitive moisture probe, temperature
 * sensor, solenoid valve and pulse flow meter. Talks only through the transport,
 * exactly as firmware would.
 */
export class VirtualNode {
  readonly herbId: string;
  /** True soil moisture (the sensor reports this plus jitter). */
  moisture: number;
  temperature: number;
  rssi = -58;
  valveOpen = false;
  runSeconds = 0;
  sessionLiters = 0;
  totalLiters: number;
  warning: string | undefined;
  link: LinkMode = "online";

  private transport: TelemetryTransport;
  private random: Random;
  private simNow: () => number;
  private unsubscribe: () => void;

  constructor(options: VirtualNodeOptions) {
    this.herbId = options.herbId;
    this.moisture = options.moisture;
    this.totalLiters = options.totalLiters;
    this.transport = options.transport;
    this.random = options.random;
    this.simNow = options.simNow;
    this.temperature = 21 + this.random() * 2;

    this.unsubscribe = this.transport.subscribe<ValveCommandPayload>(topics.valveCommand(this.herbId), ({ payload }) =>
      this.onCommand(payload),
    );
  }

  /** Announce presence and current state (MQTT "birth" message). */
  boot() {
    this.publishStatus();
    this.publishValveState();
    this.publishWaterUsed();
    this.publishTelemetry();
  }

  dispose() {
    this.unsubscribe();
  }

  /** Advance the node by `dt` simulated seconds. */
  tick(dt = 1) {
    if (this.valveOpen) {
      this.moisture = Math.min(PHYSICS.moistureCap, this.moisture + PHYSICS.absorptionPerSecond * dt);
      this.runSeconds += dt;
      this.sessionLiters = litersForSeconds(this.runSeconds);
      if (this.runSeconds >= PHYSICS.maxRunSeconds) {
        this.closeValve(WATCHDOG_WARNING);
      } else {
        this.publishValveState();
        this.publishWaterUsed();
      }
    } else {
      this.moisture = Math.max(0, this.moisture - PHYSICS.evaporationPerSecond * dt);
    }

    // Slow thermal drift around a kitchen windowsill's ~22 °C.
    this.temperature = clamp(this.temperature + (this.random() - 0.5) * 0.04 * dt, 18, 27);
    const baseRssi = this.link === "lossy" ? -84 : -58;
    this.rssi = Math.round(baseRssi + (this.random() - 0.5) * 6);

    this.publishTelemetry();
  }

  /** Dev harness: set the true soil moisture directly. Physics continue from here. */
  forceMoisture(value: number) {
    this.moisture = clamp(value, 0, 100);
    this.publishTelemetry();
  }

  setLink(mode: LinkMode) {
    if (mode === this.link) return;
    const wasOffline = this.link === "offline";
    this.link = mode;
    if (mode === "offline") {
      // The broker publishes the node's last will on its behalf.
      this.transport.publish<StatusPayload>(topics.status(this.herbId), { online: false }, { retain: true });
    } else if (wasOffline) {
      this.boot();
    }
  }

  private onCommand(command: ValveCommandPayload) {
    // An offline node never hears the command.
    if (this.link === "offline") return;
    if (command.action === "START" && !this.valveOpen) {
      this.valveOpen = true;
      this.runSeconds = 0;
      this.sessionLiters = 0;
      this.warning = undefined;
      this.publishValveState();
      this.publishWaterUsed();
    } else if (command.action === "STOP" && this.valveOpen) {
      this.closeValve();
    }
  }

  private closeValve(warning?: string) {
    this.valveOpen = false;
    this.totalLiters += this.sessionLiters;
    this.warning = warning;
    this.publishValveState();
    this.publishWaterUsed();
  }

  /** State topics are QoS 1 + retained: they survive a lossy link. */
  private publishValveState() {
    if (this.link === "offline") return;
    this.transport.publish<ValveStatePayload>(
      topics.valveState(this.herbId),
      {
        state: this.valveOpen ? "OPEN" : "CLOSED",
        flowRateLpm: this.valveOpen ? PHYSICS.flowRateLpm : 0,
        runSeconds: this.runSeconds,
        ...(this.warning ? { warning: this.warning } : {}),
      },
      { retain: true },
    );
  }

  private publishWaterUsed() {
    if (this.link === "offline") return;
    this.transport.publish<WaterUsedPayload>(
      topics.waterUsed(this.herbId),
      // Firmware reports 0.1 mL resolution, like a real pulse counter.
      {
        sessionLiters: round(this.sessionLiters, 4),
        totalLiters: round(this.totalLiters, 4),
      },
      { retain: true },
    );
  }

  private publishStatus() {
    this.transport.publish<StatusPayload>(
      topics.status(this.herbId),
      { online: this.link !== "offline" },
      { retain: true },
    );
  }

  /** Telemetry is QoS 0: dropped when offline, partially dropped when lossy. */
  private publishTelemetry() {
    if (this.link === "offline") return;
    if (this.link === "lossy" && this.random() < PHYSICS.lossyDropRate) return;
    const reading = clamp(this.moisture + sensorJitter(this.random), 0, 100);
    this.transport.publish<TelemetryPayload>(topics.telemetry(this.herbId), {
      moisture: round(reading, 1),
      temperature: round(this.temperature, 1),
      rssi: this.rssi,
      timestamp: new Date(this.simNow()).toISOString(),
    });
  }
}
