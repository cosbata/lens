import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SOURCE_AUTHORITY, BRIEFING_CONFIDENCE_FLOOR } from "../../src/core/model/source-policy";
import { calculateEventScore, EVENT_SCORE_VERSION } from "../../src/core/score/event-score";
import { DISASTER_IMPACT_VERSION } from "../../src/core/score/impact-config";
import { METHODOLOGY_EXAMPLE, Methodology } from "../../src/web/screens/Methodology";

describe("public methodology", () => {
  it("reproduces the displayed fixture score with the production scorer", () => {
    const result = calculateEventScore(METHODOLOGY_EXAMPLE);
    const html = renderToStaticMarkup(<Methodology />);

    expect(result.finalScore).toBe(42.2);
    expect(html).toContain(`Final score</span>${result.finalScore}`);
    expect(html).toContain(`Weighted base</span><strong>${result.baseScore}`);
    expect(html).toContain(`Confidence</span><strong>${result.confidenceMultiplier}`);
    expect(html).toContain(`Freshness</span><strong>${result.freshnessFactor}`);
  });

  it("shows versioned rules, source tiers, policy floor, and known limits", () => {
    const html = renderToStaticMarkup(<Methodology />);

    expect(html).toContain(EVENT_SCORE_VERSION);
    expect(html).toContain(DISASTER_IMPACT_VERSION);
    expect(html).toContain(String(BRIEFING_CONFIDENCE_FLOOR));
    for (const score of Object.values(SOURCE_AUTHORITY)) expect(html).toContain(`>${score}<`);
    expect(html).toContain("Known limits");
    expect(html).toContain("Scores compare attention priority, not human suffering.");
  });
});
