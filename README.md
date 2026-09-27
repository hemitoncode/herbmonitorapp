# Sprig — Smart Herb Garden & Irrigation Prototype

Kitchen-herb monitor with harvest timing and irrigation control. It runs entirely in the browser: there is no hardware and no broker. A simulated MQTT bus and a set of virtual ESP32-style nodes stand in for both.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine, bus, domain and full demo-scenario tests
npm run build      # typecheck + production build
```

Press <kbd>`</kbd> (or click the bar at the bottom) to open the **simulation harness**. It has a five-step guided walkthrough that ticks itself off as you go.

## What the app tells you to do

Every instruction comes from one function, `nextSteps()` in `src/domain/nextStep.ts`, so the to-do list at the top of the Kitchen view, the "next step" box on each herb card and the Telemetry banner can never disagree.

| State | Instruction | Button |
|---|---|---|
| Bolting | Cut it today | Log Harvest |
| Below the moisture line | Water it | Water now (stops itself mid-range) |
| Valve open | It's being watered | Stop |
| Sensor offline | Check the pot by hand | Diagnose |
| Peak window | Clip it | Log Harvest |
| Regrowing | Leave it, ready in N days | — |

## Architecture

```
src/
  hal/        TelemetryTransport interface, InMemoryMqttBus (+ / # wildcards, retained msgs), topic schema
  engine/     VirtualNodeEngine + VirtualNode: drying, absorption, ADC jitter, flow meter, watchdog, link faults
  domain/     HerbProfile seeds, harvest state machine, watering recommendation (with deadband)
  store/      Zustand store fed only by bus messages; valve commands go out over the bus
  components/ UI primitives (shadcn-style) + gauge, trend chart, botanical illustrations, sim drawer
  views/      KitchenView, TelemetryView
```

The UI never reaches into the engine for data. Everything arrives over `garden/{herbId}/…` topics. To move to real hardware, implement `TelemetryTransport` over MQTT.js and remove the engine in `src/store/runtime.ts`. The simulation harness is the only code that calls the engine directly.

| Topic | Direction | Payload |
|---|---|---|
| `garden/:id/telemetry` | node → app | `{ moisture, temperature, rssi, timestamp }` |
| `garden/:id/valve/state` | node → app (retained) | `{ state, flowRateLpm, runSeconds, warning? }` |
| `garden/:id/valve/command` | app → node | `{ action: "START" \| "STOP" }` |
| `garden/:id/water_used` | node → app (retained) | `{ sessionLiters, totalLiters }` |
| `garden/:id/status` | node / LWT (retained) | `{ online }` |

## Decisions and deviations from the spec

The spec has several internal contradictions. This is how each one was resolved:

1. **"Regrowing (10 days remaining)" (§6, step 6) contradicts the state machine (§4).** Peak opens at `0.7 × cycle`, which is day 7 for basil. The app says *"Est. 7 days until harvest"*, because a countdown to day 10 would announce the peak window three days late.
2. **Jitter is ±0.4 % (§3.2) in one place and ±0.5 % (diagram) in another.** The app uses §3.2: gaussian σ = 0.18, clamped to ±0.4.
3. **A raw `reading < threshold` check flaps.** With ±0.4 % noise and 0.1 %/min drying, the recommendation would flicker for about 8 minutes around the threshold. The app adds a ±0.5 % deadband, so step 4 flips at a reading of about 30.5 % rather than exactly 30 %.
4. **The speed multiplier shortens the tick interval** (1000 ms → 200 ms → 50 ms). Each tick is still one simulated second, so drying, absorption, flow and the watchdog all share one clock. At 20× the 60 s watchdog fires after 3 real seconds.
5. **"1.4 L" per session (§5.1) is impossible.** The watchdog caps a run at 60 s × 0.5 L/min = 0.5 L.
6. **Fast-forward growth only advances harvest days.** Applying 0.1 %/min of drying to a skipped day would empty every pot (−144 % per day).
7. **Additions to the spec:**
   - a `status` last-will topic
   - `runSeconds` and `warning` fields on valve state
   - a one-tap *Quick water* action that closes the valve by itself at the middle of the optimal range
   - a recent-runs log that records why each run ended
