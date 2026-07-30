import { describe, expect, it, vi } from "vitest";
import { createOperationalSignalsClient } from "../../../src/providers/pizzint/client";

const json = (value: unknown) => new Response(JSON.stringify(value), {
  status: 200,
  headers: { "content-type": "application/json" },
});

describe("PizzINT operational signals", () => {
  it("normalizes aggregate activity, tension, and reuses the ten-minute cache", async () => {
    const fetcher = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.includes("dashboard-data")) {
        return json({
          success: true,
          defcon_level: 4,
          overall_index: 38,
          active_spikes: 1,
          data_freshness: "fresh",
          data: [
            { is_spike: true, is_closed_now: false },
            { is_spike: false, is_closed_now: true },
          ],
        });
      }
      expect(url).toContain("dateStart=20260723");
      expect(url).toContain("dateEnd=20260729");
      return json({
        russia_ukraine: [
          { v: 1, conflictCount: 80, totalArticles: 300, sentiment: -3 },
          { v: 1.2, conflictCount: 100, totalArticles: 400, sentiment: -4 },
        ],
      });
    });
    const load = createOperationalSignalsClient({
      fetcher,
      now: () => Date.parse("2026-07-29T12:00:00Z"),
    });

    const first = await load();
    const second = await load();

    expect(first).toMatchObject({
      state: "fresh",
      sources: { pizzint: "fresh", gdelt: "fresh" },
      pizza: {
        level: 4,
        activity: 38,
        activeSpikes: 1,
        locationsMonitored: 2,
        locationsOpen: 1,
      },
      tensions: [{
        id: "russia_ukraine",
        trend: "rising",
        changePercent: 20,
        conflictCount: 100,
      }],
    });
    expect(second).toBe(first);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("returns a degraded empty signal instead of throwing", async () => {
    const load = createOperationalSignalsClient({
      fetcher: vi.fn<typeof fetch>(async () => {
        throw new Error("offline");
      }),
      now: () => Date.parse("2026-07-29T12:00:00Z"),
    });

    await expect(load()).resolves.toMatchObject({
      state: "degraded",
      pizza: null,
      tensions: [],
      sources: { pizzint: "unavailable", gdelt: "unavailable" },
    });
  });
});
