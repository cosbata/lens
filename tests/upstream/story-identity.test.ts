import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  adoptExistingCanonical,
  assignStoryIdentity,
} from "../../src/upstream/worldmonitor/dedup.mjs";
import {
  STORY_SIMILARITY_THRESHOLD,
  clusterTexts,
  storySimilarity,
} from "../../src/upstream/worldmonitor/story-identity.js";

const positives = [
  [
    "Fed holds interest rates steady amid inflation concerns",
    "Fed holds rates steady as inflation concerns persist",
  ],
  [
    "Magnitude 6.8 earthquake strikes northern Chile",
    "6.8-magnitude earthquake hits northern Chile",
  ],
  [
    "Iran threatens to close Strait of Hormuz - Reuters",
    "Iran threatens to close Strait of Hormuz",
  ],
];

const negatives = [
  [
    "Iran seizes oil tanker in Strait of Hormuz",
    "Iran threatens to close Strait of Hormuz",
  ],
  [
    "Turkey hikes interest rates to 50% in surprise move",
    "Argentina hikes interest rates to 50% in surprise move",
  ],
  [
    "Ukraine drone strike hits Russian oil refinery",
    "Russian drone strike hits Ukrainian energy grid",
  ],
];

const normalizeTitle = (title: string) =>
  title.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
const sha256 = async (text: string) =>
  createHash("sha256").update(text).digest("hex");

describe("vendored World Monitor story identity", () => {
  it("merges edited variants and separates distinct events", () => {
    for (const [left, right] of positives) {
      expect(storySimilarity(left, right)).toBeGreaterThanOrEqual(
        STORY_SIMILARITY_THRESHOLD,
      );
    }
    for (const [left, right] of negatives) {
      expect(storySimilarity(left, right)).toBeLessThan(
        STORY_SIMILARITY_THRESHOLD,
      );
    }
  });

  it("clusters variants independently of their input position", () => {
    const titles = [
      positives[0][0],
      negatives[0][0],
      positives[0][1],
    ];
    expect(clusterTexts(titles)).toEqual([[0, 2], [1]]);
  });

  it("counts distinct sources and adopts a previous canonical", async () => {
    const items = [
      { title: positives[0][0], source: "Reuters", publishedAt: 1 },
      { title: positives[0][1], source: "BBC", publishedAt: 2 },
    ];
    const identities = await assignStoryIdentity(items, normalizeTitle, sha256);
    const identity = identities.get(items[0]);
    expect(identity?.corroborationCount).toBe(2);
    expect(identity?.memberTitleHashes).toHaveLength(2);

    const previous = "previous-canonical";
    expect(adoptExistingCanonical(
      identity?.memberTitleHashes,
      identity?.titleHash ?? "",
      new Map([[identity?.memberTitleHashes[1] ?? "", previous]]),
    )).toBe(previous);
  });
});
