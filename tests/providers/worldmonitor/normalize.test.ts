import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  normalizeWorldMonitorFeedDigest,
  normalizeWorldMonitorIranEvents,
} from "../../../src/providers/worldmonitor/normalize";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/worldmonitor/iran-events.json", import.meta.url), "utf8"),
) as unknown;

describe("WorldMonitor adapter contract", () => {
  it("normalizes the recorded proto response with original attribution", () => {
    const [result] = normalizeWorldMonitorIranEvents(fixture, "2026-07-25T10:10:00Z");

    expect(result.observation).toMatchObject({
      id: "worldmonitor:iran:wm-iran-001",
      primaryCategory: "security",
      geometry: { type: "Point", coordinates: [51.389, 35.6892] },
      measurements: { severity: "high" },
      extension: {
        upstreamCategory: "security",
        upstreamEndpoint: "/api/conflict/v1/list-iran-events",
      },
    });
    expect(result.evidence.url).toBe(
      "https://iran.liveuamap.com/en/2026/25-july-example",
    );
  });

  it("never imports WorldMonitor importance as a LENS score", () => {
    const [result] = normalizeWorldMonitorIranEvents(fixture, "2026-07-25T10:10:00Z");
    const serialized = JSON.stringify(result.observation);

    expect(serialized).not.toContain("importanceScore");
    expect(serialized).not.toContain('"score":99');
  });

  it("passes through optional image fields from WorldMonitor records", () => {
    const withImage = structuredClone(fixture) as { events: Array<Record<string, unknown>> };
    const event = withImage.events[0];
    event.imageUrl = "https://cdn.example.com/article-1.jpg";
    event.imageAlt = "Live event image";
    event.imageCredit = "AP";
    const [result] = normalizeWorldMonitorIranEvents(withImage, "2026-07-25T10:10:00Z");

    expect(result.evidence.imageUrl).toBe("https://cdn.example.com/article-1.jpg");
    expect(result.evidence.imageAlt).toBe("Live event image");
    expect(result.evidence.imageCredit).toBe("AP");
  });

  it("fails closed on unsupported contract changes", () => {
    const changed = structuredClone(fixture) as {
      events: Array<{ category: string; severity: string }>;
    };
    changed.events[0].category = "unknown-new-domain";
    expect(() => normalizeWorldMonitorIranEvents(changed, "2026-07-25T10:10:00Z"))
      .toThrowError("invalid_worldmonitor:events.0.category");

    changed.events[0].category = "security";
    changed.events[0].severity = "catastrophic";
    expect(() => normalizeWorldMonitorIranEvents(changed, "2026-07-25T10:10:00Z"))
      .toThrowError("invalid_worldmonitor:events.0.severity");
  });
});

describe("WorldMonitor news digest adapter", () => {
  it("turns a geolocated, corroborated story into attributable LENS input", () => {
    const [result] = normalizeWorldMonitorFeedDigest({
      generatedAt: "2026-07-26T08:00:00Z",
      categories: {
        "supply-chain": {
          items: [{
            source: "Reuters",
            title: "Port closure reroutes regional shipping",
            link: "https://example.com/port-closure",
            publishedAt: Date.parse("2026-07-26T07:50:00Z"),
            location: { longitude: 55.27, latitude: 25.2 },
            locationName: "Dubai",
            snippet: "Carriers are diverting around the affected terminal.",
            corroborationCount: 3,
            isAlert: true,
            threat: {
              level: "THREAT_LEVEL_HIGH",
              category: "supply chain",
              confidence: 0.9,
            },
            storyMeta: { mentionCount: 4, sourceCount: 3, phase: "STORY_PHASE_BREAKING" },
            imageUrl: "https://example.com/photo.jpg",
          }],
        },
      },
    }, "2026-07-26T08:01:00Z");

    expect(result.observation).toMatchObject({
      primaryCategory: "supply-chains",
      geometry: { type: "Point", coordinates: [55.27, 25.2] },
      measurements: {
        alert: true,
        corroborationCount: 3,
        threatLevel: "THREAT_LEVEL_HIGH",
      },
    });
    expect(result.evidence).toMatchObject({
      url: "https://example.com/port-closure",
      imageUrl: "https://example.com/photo.jpg",
      imageCredit: "Reuters",
    });
  });
});
