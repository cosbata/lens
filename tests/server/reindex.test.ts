import { describe, expect, it } from "vitest";
import { parseObservation } from "../../src/core/model";
import { reindexedRssObservation } from "../../src/server/services/reindex";

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
});
