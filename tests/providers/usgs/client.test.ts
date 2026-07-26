import { describe, expect, it } from "vitest";
import { fetchUsgsEvents } from "../../../src/providers/usgs/client";

describe("USGS collection", () => {
  it("combines week significance and daily magnitude feeds without duplicate events", async () => {
    const requests: string[] = [];
    const feature = {
      type: "Feature",
      id: "quake-1",
      properties: {
        code: "quake-1",
        detail: "https://example.test/detail/quake-1",
      },
      geometry: { type: "Point", coordinates: [1, 2, 3] },
    };
    const fetcher = async (input: string | URL | Request) => {
      const url = String(input);
      requests.push(url);
      if (url.includes("/detail/")) {
        return Response.json({ id: "quake-1", properties: {} });
      }
      return Response.json({ type: "FeatureCollection", features: [feature] });
    };

    await expect(fetchUsgsEvents(fetcher as typeof fetch)).resolves.toHaveLength(1);
    expect(requests.some((url) => url.includes("significant_week.geojson"))).toBe(true);
    expect(requests.some((url) => url.includes("4.5_day.geojson"))).toBe(true);
    expect(requests.filter((url) => url.includes("/detail/"))).toHaveLength(1);
  });
});
