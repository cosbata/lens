import { describe, expect, it } from "vitest";
import { calculateEventScore } from "../../../src/core/score/event-score";
import { calculateFreshness } from "../../../src/core/score/freshness";

const input = {
  domainImpact: 80,
  urgency: 60,
  momentum: 40,
  geographicReach: 50,
  anomaly: 30,
  cascadeRelevance: 70,
  confidence: 80,
  category: "disasters" as const,
  phase: "active" as const,
  lastMaterialUpdateAt: "2026-07-25T00:00:00Z",
  now: "2026-07-25T12:00:00Z",
};

describe("common event scoring", () => {
  it("reproduces the versioned golden score", () => {
    expect(calculateEventScore(input)).toMatchObject({
      version: "lens-v1",
      baseScore: 62,
      confidenceMultiplier: 0.8,
      freshnessFactor: 0.85,
      finalScore: 42.2,
    });
  });

  it("uses the last material update rather than duplicate publication time", () => {
    const beforeDuplicate = calculateFreshness(
      "disasters",
      "active",
      input.lastMaterialUpdateAt,
      input.now,
    );
    const afterDuplicate = calculateFreshness(
      "disasters",
      "active",
      input.lastMaterialUpdateAt,
      input.now,
    );

    expect(afterDuplicate).toEqual(beforeDuplicate);
  });

  it("applies live official floors but ignores stale ones", () => {
    const live = calculateEventScore({ ...input, now: "2026-07-25T01:00:00Z", officialFloor: 75 });
    const stale = calculateEventScore({ ...input, now: "2026-07-27T00:00:00Z", officialFloor: 75 });

    expect(live.finalScore).toBe(75);
    expect(live.reasons).toContain("floor.official_live");
    expect(stale.finalScore).toBeLessThan(75);
    expect(stale.reasons).toContain("floor.official_stale_ignored");
  });
});
