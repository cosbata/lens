import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildStoryThread } from "../../src/core/cluster/story-thread";
import { StoryThread } from "../../src/web/components/StoryThread";

const events = [
  { id: "cause", title: "Port closes", occurredAt: "2026-07-25T10:00:00Z", category: "security" },
  { id: "effect", title: "Freight reroutes", occurredAt: "2026-07-25T11:00:00Z", category: "supply-chains" },
];

describe("story thread UI", () => {
  it("renders relationship, distinct event titles, explanation, and source", () => {
    const thread = buildStoryThread(events, [{
      fromEventId: "cause",
      toEventId: "effect",
      relation: "disrupts",
      explanation: "The carrier notice names the closure as the reason for rerouting.",
      sourceUrl: "https://example.com/carrier-notice",
    }]);
    const html = renderToStaticMarkup(<StoryThread thread={thread} activeEventId="cause" />);

    expect(html).toContain("Port closes");
    expect(html).toContain("Freight reroutes");
    expect(html).toContain("disrupts");
    expect(html).toContain("https://example.com/carrier-notice");
  });

  it("states when no verified causal link exists", () => {
    const html = renderToStaticMarkup(
      <StoryThread thread={buildStoryThread(events, [])} activeEventId="cause" />,
    );
    expect(html).toContain("No verified causal connection");
  });
});
