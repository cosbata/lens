import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fixedClock, parseFixture, serializeFixture } from "../../../src/core/fixtures";
import { parseObservation } from "../../../src/core/model";

describe("replay fixtures", () => {
  it("loads canonical data with a deterministic clock", () => {
    const json = readFileSync(new URL("../../fixtures/observation.json", import.meta.url), "utf8");
    const clock = fixedClock("2026-07-25T11:00:00Z");
    const first = parseFixture(json, parseObservation);
    const second = parseFixture(json, parseObservation);

    expect(serializeFixture(first)).toBe(serializeFixture(second));
    expect(clock().toISOString()).toBe("2026-07-25T11:00:00.000Z");
    expect(clock()).not.toBe(clock());
  });

  it("rejects malformed fixture JSON", () => {
    expect(() => parseFixture("{", parseObservation)).toThrowError("invalid_fixture_json");
    expect(() => fixedClock("tomorrow")).toThrowError("invalid_fixed_clock");
  });
});
