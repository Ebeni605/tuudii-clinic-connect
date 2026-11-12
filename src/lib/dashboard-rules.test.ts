import { describe, expect, it } from "vitest";
import { bottleneck, periodChange } from "./reports";

describe("dashboard comparisons", () => {
  it("no percentage when the previous period had no data", () => {
    expect(periodChange(5, 0)).toBeNull();
    expect(periodChange(5, null)).toBeNull();
  });
  it("computes change vs previous period", () => {
    expect(periodChange(15, 10)).toEqual({ pct: 50, dir: "up" });
    expect(periodChange(5, 10)).toEqual({ pct: 50, dir: "down" });
  });
  it("bottleneck is the step with most queued visits, none when empty", () => {
    expect(bottleneck([{ key: "opd", queued: 2 }, { key: "lab", queued: 5 }])).toBe("lab");
    expect(bottleneck([{ key: "opd", queued: 0 }])).toBeNull();
  });
});
