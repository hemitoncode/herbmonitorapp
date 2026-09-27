import { describe, expect, it } from "vitest";
import { needsWater, quickWaterTarget, wateringAdvice, type AdviceInput } from "./watering";

describe("needsWater", () => {
  it("uses a plain comparison for the first reading", () => {
    expect(needsWater(29.9, 30, null)).toBe(true);
    expect(needsWater(30, 30, null)).toBe(false);
  });

  it("holds its previous decision inside the ±0.5 deadband", () => {
    expect(needsWater(29.7, 30, false)).toBe(false);
    expect(needsWater(30.3, 30, true)).toBe(true);
  });

  it("flips once the reading clears the deadband", () => {
    expect(needsWater(29.4, 30, false)).toBe(true);
    expect(needsWater(30.5, 30, true)).toBe(false);
  });

  it("does not flap under worst-case sensor noise", () => {
    let state: boolean | null = true;
    const flips: boolean[] = [];
    for (const r of [29.6, 30.4, 29.6, 30.4, 29.55, 30.45]) {
      const next = needsWater(r, 30, state);
      if (next !== state) flips.push(next);
      state = next;
    }
    expect(flips).toEqual([]);
  });
});

describe("quickWaterTarget", () => {
  it("aims for the middle of the optimal band", () => {
    expect(quickWaterTarget(30, 60, 30)).toBe(45);
  });
  it("never stops below threshold + 2", () => {
    expect(quickWaterTarget(30, 40, 50)).toBe(52);
  });
  it("never exceeds the 95 % physical cap", () => {
    expect(quickWaterTarget(90, 100, 99)).toBe(95);
  });
});

describe("wateringAdvice", () => {
  const mint = { name: "Mint", optimalSoilMoistureMin: 40, optimalSoilMoistureMax: 70 };
  const ok: AdviceInput = {
    online: true,
    needsWater: false,
    valveOpen: false,
    autoTarget: null,
    moisture: 45,
    threshold: 40,
  };

  it("says nothing to do when soil is above the line", () => {
    expect(wateringAdvice(mint, ok)).toMatchObject({ kind: "ok", title: "Mint is fine" });
  });

  it("asks for water below the line and names the auto-stop target", () => {
    const a = wateringAdvice(mint, { ...ok, needsWater: true, moisture: 37 });
    expect(a).toMatchObject({ kind: "water", title: "Water Mint" });
    expect(a.detail).toContain("waters it to 55%");
  });

  it("reports an active run instead of asking again", () => {
    const a = wateringAdvice(mint, { ...ok, needsWater: true, valveOpen: true, autoTarget: 55 });
    expect(a).toMatchObject({ kind: "watering" });
    expect(a.detail).toContain("55%");
  });

  it("asks for a manual check when offline, and waits before the first packet", () => {
    expect(wateringAdvice(mint, { ...ok, online: false }).kind).toBe("offline");
    expect(wateringAdvice(mint, { ...ok, needsWater: null }).kind).toBe("pending");
  });
});
