import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeEonetEvents } from "../../../src/providers/eonet/normalize";
import { LensStore } from "../../../src/server/store";
import { ingestEonet } from "../../../src/server/services/ingest-eonet";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/eonet/events.json", import.meta.url), "utf8"),
) as unknown;

describe("NASA EONET provider", () => {
  it("normalizes category, ordered geometry history, magnitude, and original source", () => {
    const [result] = normalizeEonetEvents(fixture, "2026-07-25T10:00:00Z");
    expect(result.observation).toMatchObject({
      id: "eonet:EONET_9999",
      primaryCategory: "disasters",
      relatedCategories: ["climate-environment"],
      geometry: { type: "Point", coordinates: [-120.5, 38.5] },
      geometryHistory: [
        { observedAt: "2026-07-25T06:00:00Z", geometry: { type: "Point", coordinates: [-121.1, 38.1] } },
        { observedAt: "2026-07-25T09:00:00Z", geometry: { type: "Point", coordinates: [-120.5, 38.5] } },
      ],
      measurements: { magnitudeValue: 32.4, magnitudeUnit: "acres" },
      sourceFamily: "eonet:InciWeb",
    });
    expect(result.evidence.url).toContain("inciweb.wildfire.gov");
  });

  it("ingests and degrades independently", async () => {
    const store = new LensStore();
    expect((await ingestEonet({
      store,
      now: () => new Date("2026-07-25T10:00:00Z"),
      load: async () => fixture,
    })).materialUpdates).toBe(1);
    const snapshotId = store.latestSnapshot()?.id;

    await ingestEonet({
      store,
      now: () => new Date("2026-07-25T10:20:00Z"),
      load: async () => { throw new Error("eonet_unavailable"); },
    });
    expect(store.event("eonet:EONET_9999")).not.toBeNull();
    expect(store.latestSnapshot()?.id).toBe(snapshotId);
    expect(store.providerRuns()[0]).toMatchObject({
      provider: "eonet",
      state: "degraded",
      stale: true,
    });
    store.close();
  });

  it("keeps valid events when another EONET item is unsupported", () => {
    const response = structuredClone(fixture) as { events: unknown[] };
    response.events.push({
      id: "unsupported",
      title: "Unsupported event",
      link: "https://example.test/unsupported",
      categories: [{ id: "unknownCategory" }],
      geometry: [],
      sources: [],
    });
    expect(normalizeEonetEvents(response, "2026-07-25T10:00:00Z")).toHaveLength(1);
  });
});
