# Sprig — Herb Soil Monitor

Soil-moisture monitor and irrigation control for a windowsill of kitchen herbs. It runs entirely in the browser: there is no hardware and no broker. A simulated MQTT bus and a set of virtual ESP32-style soil nodes stand in for both.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine, bus, domain and full demo-scenario tests
npm run build      # typecheck + production build
```

## What it does

- **Garden** — one card per pot: live soil moisture against the pot's watering line, a plain-language instruction ("Water Mint. Soil is 37%, below its 40% line…"), and a **Water now** button that opens the valve and closes it again at the middle of the pot's optimal range.
- **Telemetry** — for one pot at a time: status banner with the action in it, radial gauge, the watering-line slider, manual Start/Stop with a 60 s watchdog countdown, session and lifetime litres, a two-minute moisture trace, node diagnostics, and the raw message log.
- **Simulation card** (inside Telemetry) — since nothing is plugged in: set the soil moisture directly, change the clock speed (1× / 5× / 20×), and drop or glitch the sensor link.

Every instruction comes from one function, `wateringAdvice()` in `src/domain/watering.ts`, so the headline, the cards and the banner can never disagree.

## Architecture

```
src/
  hal/        TelemetryTransport interface, InMemoryMqttBus (+ / # wildcards, retained msgs), topic schema
  engine/     VirtualNodeEngine + VirtualNode: drying, absorption, ADC jitter, flow meter, watchdog, link faults
  domain/     herb profiles, watering recommendation (with deadband) and advice copy
  store/      Zustand store fed only by bus messages; valve commands go out over the bus
  components/ UI primitives (shadcn-style) + gauge, trend chart, botanical illustrations
  views/      GardenView, TelemetryView
```

The UI never reaches into the engine for data. Everything arrives over `garden/{herbId}/…` topics. To move to real hardware, implement `TelemetryTransport` over MQTT.js and remove the engine in `src/store/runtime.ts`. The Simulation card is the only UI that calls the engine directly.

| Topic | Direction | Payload |
|---|---|---|
| `garden/:id/telemetry` | node → app | `{ moisture, temperature, rssi, timestamp }` |
| `garden/:id/valve/state` | node → app (retained) | `{ state, flowRateLpm, runSeconds, warning? }` |
| `garden/:id/valve/command` | app → node | `{ action: "START" \| "STOP" }` |
| `garden/:id/water_used` | node → app (retained) | `{ sessionLiters, totalLiters }` |
| `garden/:id/status` | node / LWT (retained) | `{ online }` |

## Physics (per simulated second)

- Drying: 0.1 % per minute with the valve closed.
- Absorption: 1.2 % per second with the valve open, capped at 95 %.
- Sensor jitter: gaussian, clamped to ±0.4 %.
- Flow meter: 0.5 L/min.
- Watchdog: the node closes the valve itself after 60 s of continuous flow.
- The clock-speed multiplier shortens the real tick interval (1000 ms → 50 ms at 20×) so every rule above shares one clock. At 20× a full 60 s run takes 3 real seconds.

## Decisions

- **The recommendation has a ±0.5 % deadband.** A raw `reading < threshold` check would flicker for minutes as the soil dries through the line under sensor noise. The advice therefore flips back to "No Water Needed" at about 30.5 %, not exactly 30 %.
- **Harvest / clipping tracking was removed** at the owner's request. The app is soil moisture and watering only.
