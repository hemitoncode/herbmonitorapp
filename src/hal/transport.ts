/**
 * Transport contract shared by the in-memory simulator and any future real
 * broker client (e.g. MQTT.js over WebSockets to an ESP32 fleet). The app
 * only ever talks to this interface, so swapping the transport is a one-line
 * change in `src/store/runtime.ts`.
 */
export interface BusMessage<T = unknown> {
  topic: string;
  payload: T;
  /** Wall-clock ms when the message was published. */
  receivedAt: number;
  retained: boolean;
}

export interface PublishOptions {
  /** Broker keeps the last value and replays it to new subscribers. */
  retain?: boolean;
}

export type MessageHandler<T = unknown> = (message: BusMessage<T>) => void;

export interface TelemetryTransport {
  publish<T>(topic: string, payload: T, options?: PublishOptions): void;
  /** Subscribe with an MQTT topic filter (`+` and `#` wildcards). Returns an unsubscribe fn. */
  subscribe<T>(filter: string, handler: MessageHandler<T>): () => void;
}
