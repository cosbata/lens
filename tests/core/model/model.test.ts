import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  ModelValidationError,
  parseBriefingSnapshot,
  parseEvidence,
  parseEventCluster,
  parseEventScore,
  parseObservation,
  parseProviderRun,
} from "../../../src/core/model";

const now = "2026-07-25T10:00:00Z";
const location = { geometry: { type: "Point", coordinates: [127, 37] }, globalScope: false };

describe("canonical model", () => {
  it("parses every canonical record", () => {
    expect(CATEGORIES).toHaveLength(10);
    expect(parseProviderRun({
      id: "run-1", provider: "usgs", startedAt: now, completedAt: now,
      state: "success", itemCount: 1, stale: false,
    }).provider).toBe("usgs");

    expect(parseEvidence({
      id: "evidence-1", observationId: "observation-1", sourceId: "usgs-1",
      sourceFamily: "usgs", url: "https://example.com/event", publishedAt: now,
      fetchedAt: now, title: "Earthquake", imageUrl: "https://example.com/photo.jpg",
      imageAlt: "Collapsed road", imageCredit: "Example News",
    })).toMatchObject({
      sourceFamily: "usgs",
      imageUrl: "https://example.com/photo.jpg",
      imageCredit: "Example News",
    });

    const observation = parseObservation({
      id: "observation-1", provider: "usgs", providerSourceId: "usgs-1",
      sourceFamily: "usgs", url: "https://example.com/event", occurredAt: now,
      fetchedAt: now, title: "Earthquake", description: "Magnitude 6.1 earthquake",
      primaryCategory: "disasters", relatedCategories: [], ...location,
      affectedCountries: ["KR"], measurements: { magnitude: 6.1 }, extension: {},
      geometryHistory: [
        { observedAt: "2026-07-25T09:00:00Z", geometry: { type: "Point", coordinates: [126, 36] } },
        { observedAt: now, geometry: location.geometry },
      ],
    });
    expect(observation.primaryCategory).toBe("disasters");
    expect(observation.geometryHistory).toHaveLength(2);

    expect(parseEventCluster({
      id: "event-1", title: observation.title, description: observation.description,
      primaryCategory: observation.primaryCategory, relatedCategories: [], ...location,
      affectedCountries: ["KR"], firstSeenAt: now, lastSeenAt: now,
      lastMaterialUpdateAt: now, phase: "active", measurements: { magnitude: 6.1 },
      evidenceIds: ["evidence-1"], sourceFamilies: ["usgs"],
    }).phase).toBe("active");

    const eventScore = {
      eventId: "event-1", version: "lens-v1", domainImpact: 80, urgency: 75,
      momentum: 40, reach: 50, anomaly: 60, cascade: 30, confidence: 95,
      freshness: 100, finalScore: 72, floors: [], reasons: ["official_source"],
      calculatedAt: now,
    };
    expect(parseEventScore(eventScore).finalScore).toBe(72);

    expect(parseBriefingSnapshot({
      id: "snapshot-1", createdAt: now, eventIds: ["event-1"], rankingVersion: "lens-v1",
      categoryScores: [{
        category: "disasters", score: 72, qualifyingEventIds: ["event-1"],
        calculatedAt: now, rankingVersion: "lens-v1",
      }],
      providerHealth: [{ provider: "usgs", state: "success", stale: false }],
    }).eventIds).toEqual(["event-1"]);
  });

  it.each([
    ["invalid_time", () => parseProviderRun({
      id: "run-1", provider: "usgs", startedAt: "yesterday",
      state: "success", itemCount: 1, stale: false,
    })],
    ["invalid_geometry", () => parseObservation({
      id: "o", provider: "p", providerSourceId: "s", sourceFamily: "f",
      url: "https://example.com", occurredAt: now, fetchedAt: now, title: "t",
      description: "d", primaryCategory: "disasters", relatedCategories: [],
      geometry: { type: "Point", coordinates: [181, 37] }, globalScope: false,
      affectedCountries: [], measurements: {}, extension: {},
    })],
    ["invalid_category", () => parseObservation({
      id: "o", provider: "p", providerSourceId: "s", sourceFamily: "f",
      url: "https://example.com", occurredAt: now, fetchedAt: now, title: "t",
      description: "d", primaryCategory: "sports", relatedCategories: [],
      ...location, affectedCountries: [], measurements: {}, extension: {},
    })],
    ["invalid_score", () => parseEventScore({
      eventId: "e", version: "v", domainImpact: 101, urgency: 0, momentum: 0,
      reach: 0, anomaly: 0, cascade: 0, confidence: 0, freshness: 0,
      finalScore: 0, floors: [], reasons: [], calculatedAt: now,
    })],
  ])("returns a stable %s error", (code, run) => {
    expect(run).toThrowError(ModelValidationError);
    try {
      run();
    } catch (error) {
      expect(error).toBeInstanceOf(ModelValidationError);
      expect((error as ModelValidationError).code).toBe(code);
    }
  });
});
