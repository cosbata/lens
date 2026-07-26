import { describe, expect, it } from "vitest";
import { RSS_FEEDS } from "../../src/config/rss-feeds";
import type { FeedFetchResult } from "../../src/providers/rss/client";
import { ingestRss } from "../../src/server/services/ingest-rss";
import { LensStore } from "../../src/server/store";

describe("RSS ingestion", () => {
  it("keeps feed health independent and clusters edited headlines", async () => {
    const store = new LensStore();
    const feeds = RSS_FEEDS.slice(0, 2);
    const results: FeedFetchResult[] = [
      {
        feed: feeds[0],
        status: "success",
        etag: "\"one\"",
        items: [{
          source: "Reuters",
          sourceId: "one",
          authority: "established",
          title: "Fed holds interest rates steady amid inflation concerns",
          link: "https://example.test/one",
          publishedAt: "2026-07-26T08:00:00Z",
          description: "The central bank left its target rate unchanged.",
          categoryHint: "economy",
          language: "en",
        }],
      },
      {
        feed: feeds[1],
        status: "failed",
        items: [],
        errorClass: "rss_http_503",
      },
    ];

    await expect(ingestRss({
      store,
      feeds,
      now: () => new Date("2026-07-26T09:00:00Z"),
      load: async () => results,
    })).resolves.toEqual({ feeds: 2, healthy: 1, items: 1, stories: 1 });
    expect(store.feedState(feeds[0].id)).toMatchObject({
      etag: "\"one\"",
      failureCount: 0,
      itemCount: 1,
    });
    expect(store.feedState(feeds[1].id)).toMatchObject({
      failureCount: 1,
      errorClass: "rss_http_503",
    });
    expect(store.observations()).toHaveLength(1);
    expect(store.evidenceForObservation(store.observations()[0].id)).toHaveLength(1);
    store.close();
  });

  it("merges same-outbreak reports and keeps the most precise supported place", async () => {
    const store = new LensStore();
    const feeds = RSS_FEEDS.slice(0, 2);
    const results: FeedFetchResult[] = [
      {
        feed: feeds[0],
        status: "success",
        items: [{
          source: "WHO",
          sourceId: "one",
          authority: "official",
          title: "WHO issues treatment guidance for Ebola in the Democratic Republic of the Congo",
          link: "https://example.test/ebola-guidance",
          publishedAt: "2026-07-26T08:00:00Z",
          description: "National health authorities continue the outbreak response.",
          categoryHint: "health",
          language: "en",
        }],
      },
      {
        feed: feeds[1],
        status: "success",
        items: [{
          source: "UN News",
          sourceId: "two",
          authority: "official",
          title: "Bunia opens new clinics as Ebola response grows",
          link: "https://example.test/bunia-response",
          publishedAt: "2026-07-26T08:30:00Z",
          description: "Health workers expanded care in Bunia.",
          categoryHint: "health",
          language: "en",
        }],
      },
    ];

    await expect(ingestRss({
      store,
      feeds,
      now: () => new Date("2026-07-26T09:00:00Z"),
      load: async () => results,
      loadImage: async () => undefined,
    })).resolves.toMatchObject({ items: 2, stories: 1 });

    expect(store.events()).toHaveLength(1);
    expect(store.events()[0]).toMatchObject({
      geometry: { type: "Point", coordinates: [30.252, 1.559] },
      sourceFamilies: ["WHO", "UN News"],
      measurements: {
        locationPrecision: "named_hub",
        locationDisplayName: "Bunia",
      },
    });
    expect(store.evidenceForObservation(store.observations()[0].id)).toHaveLength(2);
    store.close();
  });

  it("merges same-incident reports but keeps different named regions separate", async () => {
    const store = new LensStore();
    const feeds = RSS_FEEDS.slice(0, 3);
    const item = (
      source: string,
      sourceId: string,
      title: string,
      description: string,
      publishedAt: string,
    ) => ({
      source,
      sourceId,
      authority: "established" as const,
      title,
      link: `https://example.test/${sourceId}`,
      publishedAt,
      description,
      categoryHint: "climate-environment" as const,
      language: "en",
    });
    await ingestRss({
      store,
      feeds,
      now: () => new Date("2026-07-26T09:00:00Z"),
      load: async () => [
        {
          feed: feeds[0],
          status: "success",
          items: [item(
            "Reuters",
            "france-1",
            "Firefighters battle wildfires across France",
            "France deployed additional aircraft.",
            "2026-07-26T07:00:00Z",
          )],
        },
        {
          feed: feeds[1],
          status: "success",
          items: [item(
            "Guardian",
            "france-2",
            "France races to contain forest fires",
            "Emergency crews are tackling the same wildfire emergency.",
            "2026-07-26T07:30:00Z",
          )],
        },
        {
          feed: feeds[2],
          status: "success",
          items: [
            item(
              "WHO",
              "bunia",
              "Wildfire response expands near Bunia, DR Congo",
              "Teams are working around Bunia.",
              "2026-07-26T08:00:00Z",
            ),
            item(
              "UN News",
              "kivu",
              "Wildfire response expands in South Kivu, DR Congo",
              "Teams are working in South Kivu.",
              "2026-07-26T08:10:00Z",
            ),
          ],
        },
      ],
      loadImage: async () => undefined,
    });

    const active = store.events().filter(({ phase }) => phase === "active");
    const france = active.find(({ affectedCountries }) => affectedCountries.includes("FR"));
    expect(france?.evidenceIds).toHaveLength(2);
    expect(active.filter(({ affectedCountries }) => affectedCountries.includes("CD"))).toHaveLength(2);
    store.close();
  });

  it("does not keep an old feed article active just because it was fetched today", async () => {
    const store = new LensStore();
    const feeds = RSS_FEEDS.slice(0, 1);
    await ingestRss({
      store,
      feeds,
      now: () => new Date("2026-07-02T09:00:00Z"),
      load: async () => [{
        feed: feeds[0],
        status: "success",
        items: [{
          source: "WHO",
          sourceId: "old",
          authority: "official",
          title: "Old Ebola guidance for the Democratic Republic of the Congo",
          link: "https://example.test/old",
          publishedAt: "2026-07-01T08:00:00Z",
          description: "An archived outbreak update.",
          categoryHint: "health",
          language: "en",
        }],
      }],
      loadImage: async () => undefined,
    });

    expect(store.events()[0].phase).toBe("active");
    await ingestRss({
      store,
      feeds,
      now: () => new Date("2026-07-26T09:00:00Z"),
      load: async () => [{ feed: feeds[0], status: "success", items: [] }],
      loadImage: async () => undefined,
    });

    expect(store.events()[0].phase).toBe("resolved");
    expect(store.events()[0].lastMaterialUpdateAt).toBe("2026-07-01T08:00:00Z");
    expect(store.latestSnapshot()?.eventIds).toEqual([]);
    store.close();
  });

  it("preserves the prior feed item count after a 304 response", async () => {
    const store = new LensStore();
    const [feed] = RSS_FEEDS;
    store.saveFeedState({
      feedId: feed.id,
      etag: "\"v1\"",
      lastCheckedAt: "2026-07-26T08:00:00Z",
      lastSuccessAt: "2026-07-26T08:00:00Z",
      failureCount: 0,
      itemCount: 12,
    });
    await ingestRss({
      store,
      feeds: [feed],
      now: () => new Date("2026-07-26T09:00:00Z"),
      load: async () => [{
        feed,
        status: "not_modified",
        etag: "\"v1\"",
        items: [],
      }],
      loadImage: async () => undefined,
    });
    expect(store.feedState(feed.id)?.itemCount).toBe(12);
    store.close();
  });
});
