import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LensStore } from "../../src/server/store";
import { ingestUsgs } from "../../src/server/services/ingest-usgs";
import { ingestWorldMonitor } from "../../src/server/services/ingest-worldmonitor";

const usgs = JSON.parse(
  readFileSync(new URL("../fixtures/usgs/event.json", import.meta.url), "utf8"),
) as { feature: unknown; detail: unknown };
const worldMonitor = JSON.parse(
  readFileSync(new URL("../fixtures/worldmonitor/iran-events.json", import.meta.url), "utf8"),
) as unknown;

describe("WorldMonitor degradation isolation", () => {
  it("ingests independently without importing upstream importance", async () => {
    const store = new LensStore();
    const result = await ingestWorldMonitor({
      store,
      now: () => new Date("2026-07-25T10:10:00Z"),
      load: async () => worldMonitor,
    });

    expect(result.materialUpdates).toBe(1);
    expect(store.observation("worldmonitor:iran:wm-iran-001")).toMatchObject({
      measurements: { severity: "high" },
    });
    expect(store.eventScores("worldmonitor:iran:wm-iran-001")[0].reasons)
      .toContain("upstream_severity.high");
    expect(JSON.stringify(store.eventScores("worldmonitor:iran:wm-iran-001")))
      .not.toContain("importanceScore");
    store.close();
  });

  it("leaves the USGS event and last valid briefing intact on failure", async () => {
    const store = new LensStore();
    await ingestUsgs({
      store,
      now: () => new Date("2026-07-25T10:10:00Z"),
      load: async () => [usgs],
    });
    const lastGoodSnapshot = store.latestSnapshot()?.id;

    await ingestWorldMonitor({
      store,
      now: () => new Date("2026-07-25T10:20:00Z"),
      load: async () => { throw new Error("worldmonitor_unavailable"); },
    });

    expect(store.event("usgs:us7000abcd")).not.toBeNull();
    expect(store.latestSnapshot()?.id).toBe(lastGoodSnapshot);
    expect(store.providerRuns()[0]).toMatchObject({
      provider: "worldmonitor",
      state: "degraded",
      stale: true,
    });
    store.close();
  });

  it("ingests the live news digest without copying its importance score", async () => {
    const store = new LensStore();
    await ingestWorldMonitor({
      store,
      now: () => new Date("2026-07-26T08:01:00Z"),
      loadDigest: async () => ({
        generatedAt: "2026-07-26T08:00:00Z",
        categories: {
          crisis: {
            items: [{
              source: "AP",
              title: "Security alert issued near a regional capital",
              link: "https://example.com/security-alert",
              publishedAt: Date.parse("2026-07-26T07:50:00Z"),
              location: { longitude: 44.36, latitude: 33.31 },
              corroborationCount: 4,
              importanceScore: 99,
              isAlert: true,
              threat: { level: "THREAT_LEVEL_HIGH", category: "security" },
            }],
          },
        },
      }),
    });

    const event = store.events()[0];
    expect(event.primaryCategory).toBe("security");
    expect(store.eventScores(event.id)[0].reasons).toContain("upstream_threat.threat_level_high");
    expect(JSON.stringify(store.eventScores(event.id))).not.toContain("importanceScore");
    store.close();
  });
});
