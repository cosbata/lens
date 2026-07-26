import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { nearestChapterIndex } from "../../src/web/components/EventSidecar";
import { TODAY_EVENTS } from "../../src/web/map/briefing-fixture";
import { EventStory } from "../../src/web/screens/EventStory";

describe("synchronized event story chapters", () => {
  it("renders five evidence-grounded chapters and chapter controls", () => {
    const event = TODAY_EVENTS[0];
    const html = renderToStaticMarkup(<EventStory event={event} />);

    expect(event.storyChapters).toHaveLength(5);
    for (const [index, chapter] of event.storyChapters.entries()) {
      expect(html).toContain(`data-story-chapter="${chapter.id}"`);
      expect(html).toContain(chapter.title);
      expect(html).toContain(chapter.body);
      expect(html).toContain(chapter.mapNote);
      expect(html).toContain(`aria-label="Show chapter ${index + 1}: ${chapter.eyebrow}"`);
    }
  });

  it("selects the chapter nearest the sidecar reading position", () => {
    expect(nearestChapterIndex([120, 720, 1320, 1920, 2520], 780)).toBe(1);
    expect(nearestChapterIndex([120, 720, 1320, 1920, 2520], 2010)).toBe(3);
  });
});
