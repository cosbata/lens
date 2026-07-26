import { describe, expect, it } from "vitest";
import {
  calculateNewsImportance,
  NEWS_SCORE_VERSION,
} from "../../../src/core/score/news-importance";

describe("World Monitor news importance", () => {
  it("reproduces the published weighted formula", () => {
    expect(calculateNewsImportance({
      level: "critical",
      source: "Reuters",
      corroborationCount: 3,
      publishedAt: "2026-07-26T09:00:00Z",
      now: "2026-07-26T09:00:00Z",
      title: "Major port disruption",
    })).toMatchObject({
      version: NEWS_SCORE_VERSION,
      finalScore: 94,
      tier: 1,
      components: { severity: 100, sourceTrust: 100, corroboration: 60, recency: 100 },
    });
  });

  it("keeps bonuses inspectable and clamps the public score", () => {
    const result = calculateNewsImportance({
      level: "critical",
      source: "Reuters",
      corroborationCount: 5,
      entityCorroborationCount: 5,
      publishedAt: "2026-07-26T09:00:00Z",
      now: "2026-07-26T09:00:00Z",
      title: "Iran ceasefire talks advance",
    });
    expect(result.finalScore).toBe(100);
    expect(result.reasons).toContain("public_score.clamped_100");
  });
});
