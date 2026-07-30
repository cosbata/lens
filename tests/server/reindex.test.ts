import { describe, expect, it } from "vitest";
import { parseEventCluster, parseObservation } from "../../src/core/model";
import {
  reindexStoredLocations,
  reindexedRssObservation,
} from "../../src/server/services/reindex";
import { LensStore } from "../../src/server/store";

describe("stored location reindex", () => {
  it("replaces an old country centroid without changing observation identity", () => {
    const observation = parseObservation({
      id: "rss:france",
      provider: "rss",
      providerSourceId: "france",
      sourceFamily: "rss-news",
      url: "https://example.com/france",
      occurredAt: "2026-07-26T00:00:00Z",
      fetchedAt: "2026-07-26T00:05:00Z",
      title: "Wildfires spread across France",
      description: "Firefighters continue containment work.",
      primaryCategory: "climate-environment",
      relatedCategories: [],
      geometry: { type: "Point", coordinates: [-2.4, 46.2] },
      globalScope: false,
      affectedCountries: ["FR"],
      measurements: { locationPrecision: "country_approximate" },
      extension: {},
    });

    expect(reindexedRssObservation(observation)).toMatchObject({
      id: "rss:france",
      geometry: { type: "Point", coordinates: [2.3522, 48.8566] },
      affectedCountries: ["FR"],
      measurements: {
        locationPrecision: "country_approximate",
        locationDisplayName: "France",
      },
    });
  });

  it("updates the stored event at the same identity", () => {
    const store = new LensStore();
    const observation = parseObservation({
      id: "rss:bordeaux",
      provider: "rss",
      providerSourceId: "bordeaux",
      sourceFamily: "rss-news",
      url: "https://example.com/bordeaux",
      occurredAt: "2026-07-26T00:00:00Z",
      fetchedAt: "2026-07-26T00:05:00Z",
      title: "Wildfires spread near Bordeaux",
      description: "Firefighters continue containment work in Gironde.",
      primaryCategory: "climate-environment",
      relatedCategories: [],
      geometry: { type: "Point", coordinates: [-22.535, 26.6] },
      globalScope: false,
      affectedCountries: ["FR"],
      measurements: { locationPrecision: "country_approximate" },
      extension: {},
    });
    store.saveObservation(observation);
    store.saveEvent(parseEventCluster({
      id: "event:rss:bordeaux",
      title: observation.title,
      description: observation.description,
      primaryCategory: observation.primaryCategory,
      relatedCategories: [],
      geometry: observation.geometry,
      globalScope: false,
      affectedCountries: observation.affectedCountries,
      firstSeenAt: observation.fetchedAt,
      lastSeenAt: observation.fetchedAt,
      lastMaterialUpdateAt: observation.occurredAt,
      phase: "active",
      measurements: observation.measurements,
      evidenceIds: [],
      sourceFamilies: ["rss-news"],
    }));

    expect(reindexStoredLocations(store)).toMatchObject({ changed: 1 });
    expect(store.event("event:rss:bordeaux")).toMatchObject({
      id: "event:rss:bordeaux",
      geometry: { type: "Point", coordinates: [-0.5800364, 44.841225] },
    });
    store.close();
  });
});
