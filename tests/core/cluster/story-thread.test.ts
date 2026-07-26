import { describe, expect, it } from "vitest";
import { buildStoryThread } from "../../../src/core/cluster/story-thread";

const events = [
  { id: "cause", title: "Port closes", occurredAt: "2026-07-25T10:00:00Z", category: "security" },
  { id: "effect", title: "Freight reroutes", occurredAt: "2026-07-25T11:00:00Z", category: "supply-chains" },
];

describe("causal story thread", () => {
  it("links evidence-backed events without merging their identities", () => {
    const thread = buildStoryThread(events, [{
      fromEventId: "cause",
      toEventId: "effect",
      relation: "disrupts",
      explanation: "The carrier notice names the closure as the reason for rerouting.",
      sourceUrl: "https://example.com/carrier-notice",
    }]);

    expect(thread.events.map(({ id }) => id)).toEqual(["cause", "effect"]);
    expect(thread.links).toHaveLength(1);
    expect(thread.links[0]).toMatchObject({ relation: "disrupts" });
  });

  it("rejects self-links, missing events, and unattributed claims", () => {
    expect(() => buildStoryThread(events, [{
      fromEventId: "cause",
      toEventId: "cause",
      relation: "amplifies",
      explanation: "Invalid",
      sourceUrl: "https://example.com",
    }])).toThrowError("story_thread_invalid_link");
    expect(() => buildStoryThread(events, [{
      fromEventId: "cause",
      toEventId: "missing",
      relation: "amplifies",
      explanation: "Invalid",
      sourceUrl: "not-a-url",
    }])).toThrowError("story_thread_invalid_link");
  });
});
