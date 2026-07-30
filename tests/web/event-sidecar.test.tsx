import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EventStory } from "../../src/web/screens/EventStory";
import { eventStoryHref } from "../../src/web/screens/TodayOverview";
import { TODAY_EVENTS } from "../../src/web/map/briefing-fixture";
import { comparisonHref } from "../../src/web/map/temporal";

describe("event story sidecar", () => {
  it("renders every story claim and evidence link from the fixture", () => {
    const event = TODAY_EVENTS[0];
    const html = renderToStaticMarkup(<EventStory event={event} />);

    for (const claim of [
      event.title,
      event.summary,
      event.whyItMatters,
      event.whatChanged,
      event.affected,
      event.selectionReason,
    ]) {
      expect(html).toContain(claim);
    }

    for (const item of event.evidence) {
      expect(html).toContain(item.fact);
      expect(html).toContain(item.source);
      expect(html).toContain(item.url);
      expect(html).toContain(`evidence__kind--${item.kind}`);
    }
  });

  it("includes the editorial map action, source line, and selection explanation", () => {
    const event = TODAY_EVENTS[1];
    const html = renderToStaticMarkup(<EventStory event={event} />);

    expect(html).toContain("Locate this event");
    expect(html).toContain("Why this was selected");
    expect(html).toContain(event.source);
    expect(html).toContain(event.updatedAt);
    expect(html).toContain('aria-label="Close event story"');
    expect(html).toContain(`src="${event.media?.src.replaceAll("&", "&amp;")}"`);
    expect(html).toContain(`alt="${event.media?.alt}"`);
  });

  it("offers immediate event routes from the overview and every detail view", () => {
    const event = TODAY_EVENTS[1];
    const html = renderToStaticMarkup(<EventStory event={event} />);

    expect(eventStoryHref(event.id)).toBe(`#event/${event.id}`);
    for (const option of TODAY_EVENTS) {
      expect(html).toContain(`href="#event/${option.id}"`);
      expect(html).toContain(`aria-label="Show ${option.title}"`);
    }
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(`aria-label="Previous event: ${TODAY_EVENTS[0].title}"`);
    expect(html).toContain(`aria-label="Next event: ${TODAY_EVENTS[2].title}"`);
    expect(html).toContain(`href="${comparisonHref(event.id)}"`);
  });
});
