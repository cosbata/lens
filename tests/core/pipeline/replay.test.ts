import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  runFixturePipeline,
  type ReplayFixture,
} from "../../../src/core/pipeline/replay";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/replay/baseline.json", import.meta.url), "utf8"),
) as ReplayFixture;

describe("fixture briefing pipeline", () => {
  it("emits a byte-identical ordered snapshot on every replay", () => {
    const first = runFixturePipeline(fixture);
    const second = runFixturePipeline(fixture);

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.eventIds).toEqual(["quake-a", "security-b", "economy-c"]);
    expect(first.events[0].observationIds).toEqual(["quake-a", "quake-a-copy"]);
  });

  it("keeps score, confidence, and selection reasons in the snapshot", () => {
    const snapshot = runFixturePipeline(fixture);

    expect(snapshot.events.every(({ scoreReasons, confidenceReasons, selectionReasons }) =>
      scoreReasons.length > 0 && confidenceReasons.length > 0 && selectionReasons.length > 0
    )).toBe(true);
    expect(snapshot.categoryScores).toHaveLength(3);
  });
});
