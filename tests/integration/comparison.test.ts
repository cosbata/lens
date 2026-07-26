import { describe, expect, it } from "vitest";
import type { EventCluster, EventScore } from "../../src/core/model";
import { compareSnapshots, type ComparedEvent } from "../../src/core/compare/snapshots";

function item(id: string, score: number, updated = "2026-07-25T10:00:00Z"): ComparedEvent {
  const event: EventCluster = {
    id,
    title: id,
    description: id,
    primaryCategory: "disasters",
    relatedCategories: [],
    geometry: { type: "Point", coordinates: [0, 0] },
    globalScope: false,
    affectedCountries: ["KR"],
    firstSeenAt: "2026-07-24T10:00:00Z",
    lastSeenAt: updated,
    lastMaterialUpdateAt: updated,
    phase: "active",
    measurements: {},
    evidenceIds: [],
    sourceFamilies: ["official"],
  };
  const eventScore: EventScore = {
    eventId: id,
    version: "lens-v1",
    domainImpact: score,
    urgency: score,
    momentum: score,
    reach: score,
    anomaly: score,
    cascade: score,
    confidence: score,
    freshness: score,
    finalScore: score,
    floors: [],
    reasons: [],
    calculatedAt: updated,
  };
  return { event, score: eventScore };
}

describe("snapshot comparison", () => {
  it("classifies every material transition deterministically", () => {
    const before = [item("changed", 50), item("easing", 80), item("resolved", 60)];
    const after = [
      item("changed", 60, "2026-07-25T11:00:00Z"),
      item("easing", 65),
      item("added", 70),
    ];

    expect(compareSnapshots(before, after).map(({ eventId, status }) => [eventId, status]))
      .toEqual([
        ["changed", "changed"],
        ["easing", "easing"],
        ["resolved", "resolved"],
        ["added", "added"],
      ]);
  });
});
