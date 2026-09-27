import type {
  BusMessage,
  MessageHandler,
  PublishOptions,
  TelemetryTransport,
} from "./transport";

/**
 * MQTT 3.1.1 topic-filter matching.
 * `+` matches exactly one level, `#` matches the remaining levels (including none)
 * and is only valid as the final level.
 */
export function topicMatches(filter: string, topic: string): boolean {
  const f = filter.split("/");
  const t = topic.split("/");
  for (let i = 0; i < f.length; i++) {
    const level = f[i];
    if (level === "#") return i === f.length - 1;
    if (i >= t.length) return false;
    if (level !== "+" && level !== t[i]) return false;
  }
  return f.length === t.length;
}

interface Subscription {
  filter: string;
  handler: MessageHandler;
}

/**
 * Synchronous in-memory pub/sub that mimics an MQTT broker: topic filters,
 * retained messages, and isolated subscriber failures.
 */
export class InMemoryMqttBus implements TelemetryTransport {
  private subscriptions = new Set<Subscription>();
  private retained = new Map<string, BusMessage>();
  private now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  publish<T>(topic: string, payload: T, options: PublishOptions = {}): void {
    if (topic.includes("+") || topic.includes("#")) {
      throw new Error(`Wildcards are not allowed in publish topics: ${topic}`);
    }
    const message: BusMessage<T> = {
      topic,
      payload,
      receivedAt: this.now(),
      retained: false,
    };
    if (options.retain) this.retained.set(topic, { ...message, retained: true });

    // Snapshot so handlers that (un)subscribe mid-dispatch don't skew delivery.
    for (const sub of [...this.subscriptions]) {
      if (!this.subscriptions.has(sub) || !topicMatches(sub.filter, topic)) continue;
      try {
        sub.handler(message);
      } catch (error) {
        // A broken subscriber must never take the broker down with it.
        console.error(`[bus] subscriber for "${sub.filter}" threw`, error);
      }
    }
  }

  subscribe<T>(filter: string, handler: MessageHandler<T>): () => void {
    const sub: Subscription = { filter, handler: handler as MessageHandler };
    this.subscriptions.add(sub);
    for (const message of this.retained.values()) {
      if (topicMatches(filter, message.topic)) handler(message as BusMessage<T>);
    }
    return () => {
      this.subscriptions.delete(sub);
    };
  }
}
