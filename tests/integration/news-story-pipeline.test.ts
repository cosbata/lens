import { describe, expect, it } from "vitest";
import { RSS_FEEDS } from "../../src/config/rss-feeds";
import type { FeedFetchResult } from "../../src/providers/rss/client";
import { ingestRss } from "../../src/server/services/ingest-rss";
import { LensStore } from "../../src/server/store";

describe("self-hosted news story pipeline", () => {
  it("deduplicates sources, chooses the strongest representative, and publishes its image", async () => {
    const store = new LensStore();
    const feeds = RSS_FEEDS.slice(0, 2);
    const common = {
      sourceId: "report",
      title: "Port closure disrupts shipping through Suez Canal",
      description: "Cargo operators rerouted vessels after the port closure.",
      categoryHint: "supply-chains" as const,
      language: "en",
    };
    const results: FeedFetchResult[] = [
      {
        feed: feeds[0],
        status: "success",
        items: [{
          ...common,
          source: "Reuters",
          authority: "established",
          link: "https://reuters.example/report",
          publishedAt: "2026-07-26T08:00:00Z",
          imageUrl: "https://reuters.example/report.jpg",
          imageCredit: "Reuters",
        }],
      },
      {
        feed: feeds[1],
        status: "success",
        items: [{
          ...common,
          source: "BBC World",
          authority: "established",
          link: "https://bbc.example/report",
          publishedAt: "2026-07-26T08:30:00Z",
        }],
      },
    ];

    await ingestRss({
      store,
      feeds,
      load: async () => results,
      loadImage: async () => undefined,
      now: () => new Date("2026-07-26T09:00:00Z"),
    });

    const [observation] = store.observations();
    const [event] = store.events();
    const [score] = store.eventScores(event.id);
    expect(observation.url).toBe("https://reuters.example/report");
    expect(event.sourceFamilies).toEqual(["Reuters", "BBC World"]);
    expect(event.measurements.corroborationCount).toBe(2);
    expect(store.evidenceForObservation(observation.id)).toHaveLength(2);
    expect(store.evidenceForObservation(observation.id)[0].imageUrl)
      .toBe("https://reuters.example/report.jpg");
    expect(score.version).toBe("wm-lens-news-v1");
    expect(score.reasons).toContain("distinct_sources.2.40");
    store.close();
  });
});
