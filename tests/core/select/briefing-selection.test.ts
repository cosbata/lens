import { describe, expect, it } from "vitest";
import {
  selectBriefing,
  type BriefingCandidate,
} from "../../../src/core/select/briefing-selection";

const candidate = (id: string, overrides: Partial<BriefingCandidate> = {}): BriefingCandidate => ({
  id,
  score: 70,
  primaryCategory: "disasters",
  countries: ["KR"],
  similarity: {},
  ...overrides,
});

describe("briefing selection", () => {
  it("enforces the score floor and category/country caps", () => {
    const selected = selectBriefing([
      candidate("a", { score: 89 }),
      candidate("b", { score: 80 }),
      candidate("c", { score: 79 }),
      candidate("d", { primaryCategory: "security", countries: ["JP"], score: 78 }),
      candidate("e", { primaryCategory: "economy", countries: ["US"], score: 54 }),
    ]);

    expect(selected.map(({ id }) => id)).toEqual(["a", "b", "d"]);
    expect(selected.every(({ score }) => score >= 55)).toBe(true);
  });

  it("allows a 90-point event to bypass a diversity cap", () => {
    const selected = selectBriefing([
      candidate("a", { score: 95 }),
      candidate("b", { score: 92 }),
      candidate("c", { score: 90 }),
    ]);

    expect(selected.map(({ id }) => id)).toEqual(["a", "b", "c"]);
    expect(selected[2].reasons).toContain("override.critical_event");
  });

  it("penalizes a redundant event and returns a stable order", () => {
    const inputs = [
      candidate("a", { score: 85, primaryCategory: "disasters", countries: ["KR"] }),
      candidate("b", {
        score: 84,
        primaryCategory: "security",
        countries: ["JP"],
        similarity: { a: 0.9 },
      }),
      candidate("c", { score: 75, primaryCategory: "economy", countries: ["US"] }),
    ];

    expect(selectBriefing(inputs).map(({ id }) => id)).toEqual(["a", "c", "b"]);
    expect(selectBriefing(inputs)).toEqual(selectBriefing(inputs));
  });
});
