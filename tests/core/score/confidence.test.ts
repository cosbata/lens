import { describe, expect, it } from "vitest";
import { calculateConfidence } from "../../../src/core/score/confidence";
import type { ConfidenceSource } from "../../../src/core/model/source-policy";

const source = (overrides: Partial<ConfidenceSource> = {}): ConfidenceSource => ({
  sourceId: "source-1",
  sourceFamily: "wire-a",
  authority: "established",
  structured: false,
  completeness: 100,
  ...overrides,
});

describe("confidence scoring", () => {
  it("counts syndicated copies as one family", () => {
    const single = calculateConfidence([source()]);
    const copies = calculateConfidence([
      source(),
      source({ sourceId: "source-2" }),
      source({ sourceId: "source-3" }),
    ]);

    expect(copies.sourceFamilyCount).toBe(1);
    expect(copies.confidence).toBe(single.confidence);
    expect(copies.components.independentSupport).toBe(0);
  });

  it("allows one official structured observation to be high confidence", () => {
    const result = calculateConfidence([
      source({ authority: "official", sourceFamily: "usgs", structured: true, completeness: 90 }),
    ]);

    expect(result.confidence).toBe(70);
    expect(result.eligibleForBriefing).toBe(true);
    expect(result.reasons).toContain("floor.official_structured");
  });

  it("rewards independent families and gates weak reports", () => {
    const corroborated = calculateConfidence([
      source({ authority: "institutional", sourceFamily: "un" }),
      source({ authority: "specialist", sourceFamily: "local" }),
      source({ authority: "established", sourceFamily: "wire" }),
    ]);
    const weak = calculateConfidence([
      source({ authority: "unknown", sourceFamily: "social", completeness: 30 }),
    ]);

    expect(corroborated.components.independentSupport).toBe(100);
    expect(corroborated.eligibleForBriefing).toBe(true);
    expect(weak.confidence).toBeLessThan(45);
    expect(weak.reasons).toContain("gate.below_confidence");
  });
});
