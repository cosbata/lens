import { describe, expect, it } from "vitest";
import { classifyNews } from "../../src/upstream/worldmonitor/classifier";
import type { Category } from "../../src/core/model";

const cases: Array<[Category, string]> = [
  ["conflict", "Missile strike reported after troops deployed"],
  ["politics-diplomacy", "Leaders sign treaty at regional summit"],
  ["security", "Ransomware cyber attack disrupts hospitals"],
  ["disasters", "Magnitude 6.8 earthquake triggers tsunami warning"],
  ["climate-environment", "New emissions target follows climate change report"],
  ["economy", "Central bank raises interest rate as inflation persists"],
  ["energy", "Oil refinery outage lifts natural gas and oil price"],
  ["supply-chains", "Port closure forces cargo shipping route diversions"],
  ["health", "Disease outbreak prompts public health emergency"],
  ["technology-infrastructure", "Cloud outage causes internet outage"],
];

describe("LENS news classifier", () => {
  it.each(cases)("maps keyword evidence to %s", (expected, title) => {
    const classification = classifyNews(title, "politics-diplomacy");
    expect(classification.primaryCategory).toBe(expected);
    expect(classification.source).toBe("keyword");
    expect(classification.matchedKeywords.length).toBeGreaterThan(0);
  });

  it("uses the feed category only when no event keyword matches", () => {
    expect(classifyNews("Agency publishes its weekly bulletin", "health"))
      .toMatchObject({
        primaryCategory: "health",
        level: "info",
        confidence: 0.4,
        source: "feed_hint",
      });
  });
});
