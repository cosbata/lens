import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { LensStore } from "../../src/server/store";
import { ingestUsgs } from "../../src/server/services/ingest-usgs";
import { startNonOverlappingPoller } from "../../src/server/scheduler/non-overlapping";

const fixture = JSON.parse(
  readFileSync(new URL("../fixtures/usgs/event.json", import.meta.url), "utf8"),
) as { feature: unknown; detail: unknown };

describe("live USGS ingestion", () => {
  it("updates one event and only scores material revisions", async () => {
    const store = new LensStore();
    const now = () => new Date("2026-07-25T10:10:00Z");
    const load = async () => [fixture];

    expect((await ingestUsgs({ store, now, load })).materialUpdates).toBe(1);
    expect(store.events()).toHaveLength(1);
    expect(store.eventScores("usgs:us7000abcd")).toHaveLength(1);
    expect(store.latestSnapshot()?.eventIds).toContain("usgs:us7000abcd");

    expect((await ingestUsgs({ store, now, load })).materialUpdates).toBe(0);
    expect(store.eventScores("usgs:us7000abcd")).toHaveLength(1);
    store.close();
  });

  it("records degradation and preserves the last good briefing", async () => {
    const store = new LensStore();
    const now = () => new Date("2026-07-25T10:10:00Z");
    await ingestUsgs({ store, now, load: async () => [fixture] });
    const snapshotId = store.latestSnapshot()?.id;

    const result = await ingestUsgs({
      store,
      now: () => new Date("2026-07-25T10:20:00Z"),
      load: async () => { throw new Error("network_down"); },
    });

    expect(result.error).toBeInstanceOf(Error);
    expect(store.latestSnapshot()?.id).toBe(snapshotId);
    expect(store.providerRuns()[0]).toMatchObject({
      state: "degraded",
      stale: true,
      errorClass: "network_down",
    });
    store.close();
  });

  it("never overlaps scheduled polls", async () => {
    vi.useFakeTimers();
    let active = 0;
    let maximum = 0;
    let finish: (() => void) | undefined;
    const run = vi.fn(async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise<void>((resolve) => { finish = resolve; });
      active -= 1;
    });
    const stop = startNonOverlappingPoller(run, 100);
    await vi.advanceTimersByTimeAsync(500);
    expect(run).toHaveBeenCalledTimes(1);
    finish?.();
    await vi.advanceTimersByTimeAsync(100);
    expect(run).toHaveBeenCalledTimes(2);
    expect(maximum).toBe(1);
    stop();
    vi.useRealTimers();
  });
});
