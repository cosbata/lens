import { describe, expect, it } from "vitest";
import { classifyNews } from "../../src/upstream/worldmonitor/classifier";
import type { Category } from "../../src/core/model";

const cases: Array<[Category, string, string]> = [
  ["conflict", "Missile strike reported after troops deployed", "missile-drone"],
  ["politics-diplomacy", "Leaders sign treaty at regional summit", "treaty"],
  ["security", "Ransomware cyber attack disrupts hospitals", "cyberattack"],
  ["disasters", "Magnitude 6.8 earthquake triggers tsunami warning", "earthquake"],
  ["climate-environment", "New emissions target follows climate change report", "unknown"],
  ["economy", "Central bank raises interest rate as inflation persists", "rates"],
  ["energy", "Oil refinery outage lifts natural gas and oil price", "oil-gas"],
  ["supply-chains", "Port closure forces cargo shipping route diversions", "port"],
  ["health", "Disease outbreak prompts public health emergency", "outbreak"],
  ["technology-infrastructure", "Cloud outage causes internet outage", "outage"],
];

describe("LENS news classifier", () => {
  it.each(cases)("maps keyword evidence to %s", (expected, title, eventType) => {
    const classification = classifyNews(title, "politics-diplomacy");
    expect(classification.primaryCategory).toBe(expected);
    expect(classification.eventType).toBe(eventType);
    expect(classification.source).toBe("keyword");
    expect(classification.matchedKeywords.length).toBeGreaterThan(0);
  });

  it("uses the feed category only when no event keyword matches", () => {
    expect(classifyNews("Agency publishes its weekly bulletin", "health"))
      .toMatchObject({
        primaryCategory: "health",
        level: "info",
        confidence: 0.4,
        eventType: "unknown",
        source: "feed_hint",
      });
  });
});
