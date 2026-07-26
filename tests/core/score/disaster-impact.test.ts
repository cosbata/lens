import { describe, expect, it } from "vitest";
import { calculateEarthquakeImpact } from "../../../src/core/score/disaster-impact";

describe("earthquake domain impact", () => {
  it("applies documented orange and red alert floors", () => {
    const base = { magnitude: 4, significance: 50, felt: 2, tsunami: false };
    const orange = calculateEarthquakeImpact({ ...base, alert: "orange" });
    const red = calculateEarthquakeImpact({ ...base, alert: "red" });

    expect(orange.domainImpact).toBe(75);
    expect(orange.reasons).toContain("floor.alert_orange");
    expect(red.domainImpact).toBe(90);
    expect(red.reasons).toContain("floor.alert_red");
  });

  it("keeps ordinary low-impact earthquakes below the briefing threshold", () => {
    const result = calculateEarthquakeImpact({
      magnitude: 3.8,
      significance: 80,
      felt: 0,
      tsunami: false,
      alert: null,
    });

    expect(result.domainImpact).toBe(10.8);
    expect(result.domainImpact).toBeLessThan(55);
    expect(result.version).toBe("disaster-impact-v1");
  });

  it("preserves a component breakdown and rejects malformed measurements", () => {
    const result = calculateEarthquakeImpact({
      magnitude: 6.1,
      significance: 650,
      felt: 82,
      tsunami: true,
      alert: "green",
    });

    expect(result.domainImpact).toBe(66.1);
    expect(result.components).toEqual({
      physicalIntensity: 62,
      providerSignificance: 65,
      publicExposure: 57.6,
      tsunami: 100,
    });
    expect(() => calculateEarthquakeImpact({
      magnitude: Number.NaN,
      significance: 0,
      felt: null,
      tsunami: false,
      alert: null,
    })).toThrowError("invalid_earthquake_measurements");
  });
});
