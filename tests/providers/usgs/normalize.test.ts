import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeUsgsEvent } from "../../../src/providers/usgs/normalize";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/usgs/event.json", import.meta.url), "utf8"),
) as { feature: unknown; detail: unknown };
const fetchedAt = "2026-07-25T10:10:00Z";

describe("USGS normalizer", () => {
  it("normalizes recorded feed and detail payloads deterministically", () => {
    const first = normalizeUsgsEvent(fixture.feature, fixture.detail, fetchedAt);
    const second = normalizeUsgsEvent(fixture.feature, fixture.detail, fetchedAt);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.observation.providerSourceId).toBe("us7000abcd");
    expect(first.observation.measurements).toMatchObject({
      magnitude: 6.1,
      significance: 650,
      felt: 82,
      tsunami: false,
      alert: "green",
      depthKm: 18.5,
    });
    expect(first.evidence.url).toContain("earthquake.usgs.gov");
  });

  it("rejects malformed payloads without a partial record", () => {
    const malformed = structuredClone(fixture.feature) as { geometry: { coordinates: unknown[] } };
    malformed.geometry.coordinates = [127.2];

    expect(() => normalizeUsgsEvent(malformed, fixture.detail, fetchedAt))
      .toThrowError("invalid_usgs:geometry");
    expect(() => normalizeUsgsEvent(fixture.feature, { id: "other", properties: {} }, fetchedAt))
      .toThrowError("invalid_usgs:detail.id");
  });
});
