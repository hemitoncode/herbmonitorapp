import { describe, expect, it } from "vitest";
import { HERB_SEEDS } from "./herbs";
import { gardenTodo, nextSteps, type StepInput } from "./nextStep";

const basil = HERB_SEEDS[0]!.profile; // day 8/10 → peak
const mint = HERB_SEEDS[1]!.profile; // day 19/14 → bolting
const rosemary = HERB_SEEDS[2]!.profile; // day 6/21 → regrowing

const ok: StepInput = {
  online: true,
  needsWater: false,
  valveOpen: false,
  autoTarget: null,
  moisture: 42,
  threshold: 30,
};

describe("nextSteps", () => {
  it("tells you to clip at peak and nothing else when soil is fine", () => {
    const steps = nextSteps(basil, ok);
    expect(steps.map((s) => s.kind)).toEqual(["clip"]);
    expect(steps[0]!.title).toBe("Clip Basil");
  });

  it("puts cutting a bolting herb ahead of watering it", () => {
    const steps = nextSteps(mint, {
      ...ok,
      needsWater: true,
      moisture: 37,
      threshold: 40,
    });
    expect(steps.map((s) => s.kind)).toEqual(["cut", "water"]);
    expect(steps[1]!.detail).toContain("waters it to 55%");
  });

  it("says leave it while regrowing, with a day count", () => {
    const [step] = nextSteps(rosemary, ok);
    expect(step).toMatchObject({
      kind: "wait",
      title: "Leave Rosemary to regrow",
    });
    expect(step!.detail).toContain("9 days");
  });

  it("reports an active run instead of asking for water", () => {
    const [step] = nextSteps(basil, {
      ...ok,
      needsWater: true,
      valveOpen: true,
      autoTarget: 45,
    });
    expect(step).toMatchObject({ kind: "watering" });
    expect(step!.detail).toContain("45%");
  });

  it("asks for a manual check when the sensor is offline", () => {
    const steps = nextSteps(basil, { ...ok, online: false, needsWater: true });
    expect(steps.map((s) => s.kind)).toEqual(["offline", "clip"]);
  });
});

describe("gardenTodo", () => {
  it("orders the whole garden by urgency and drops wait steps", () => {
    const todo = gardenTodo([
      { profile: rosemary, rt: ok },
      { profile: basil, rt: ok },
      {
        profile: mint,
        rt: { ...ok, needsWater: true, moisture: 37, threshold: 40 },
      },
    ]);
    expect(todo.map((t) => `${t.kind}:${t.herbId}`)).toEqual(["cut:mint", "water:mint", "clip:basil"]);
  });

  it("is empty when everything is regrowing and watered", () => {
    expect(gardenTodo([{ profile: rosemary, rt: ok }])).toEqual([]);
  });
});
