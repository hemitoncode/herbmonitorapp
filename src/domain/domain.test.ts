import { describe, expect, it } from "vitest";
import { harvestState } from "./harvest";
import { needsWater, quickWaterTarget } from "./watering";

describe("harvestState", () => {
  const at = (days: number, cycle = 10) => harvestState({ regrowthCycleDays: cycle, daysSinceLastCut: days });

  it("is regrowing below 70 % of the cycle", () => {
    expect(at(0)).toMatchObject({ status: "regrowing", daysUntilPeak: 7 });
    expect(at(0).label).toBe("Regrowing — Est. 7 days until harvest");
    expect(at(6.5).daysUntilPeak).toBe(1);
    expect(at(6.5).label).toContain("1 day until");
  });

  it("is at peak from 70 % up to (not including) 130 %", () => {
    expect(at(7).status).toBe("peak");
    expect(at(8).label).toBe("Ready to Clip (Peak Flavor)");
    expect(at(12.99).status).toBe("peak");
  });

  it("flags bolting risk at 130 % and beyond", () => {
    expect(at(13).status).toBe("bolting");
    expect(at(40).label).toBe("Harvest Urgently (Bolting Risk)");
  });
});

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
