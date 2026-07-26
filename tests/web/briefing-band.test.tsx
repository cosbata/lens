import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BriefingBand, moveIndex } from "../../src/web/components/BriefingBand";
import { TODAY_EVENTS } from "../../src/web/map/briefing-fixture";

describe("editorial briefing band", () => {
  it("renders the active event, sources, progress, and traversal controls", () => {
    const html = renderToStaticMarkup(
      <BriefingBand events={TODAY_EVENTS} activeIndex={0} onSelect={() => undefined} />,
    );

    expect(html).toContain(TODAY_EVENTS[0].title);
    expect(html).toContain(TODAY_EVENTS[0].source);
    expect(html).toContain('aria-label="Previous event"');
    expect(html).toContain('aria-label="Next event"');
    expect((html.match(/aria-label="Show event/g) ?? [])).toHaveLength(3);
  });

  it("wraps previous and next traversal deterministically", () => {
    expect(moveIndex(0, -1, 3)).toBe(2);
    expect(moveIndex(2, 1, 3)).toBe(0);
  });

  it("renders a single primary issue without redundant traversal", () => {
    const html = renderToStaticMarkup(
      <BriefingBand events={[TODAY_EVENTS[0]]} activeIndex={0} />,
    );

    expect(html).toContain("Today’s main issue");
    expect(html).not.toContain('aria-label="Previous event"');
    expect(html).not.toContain('aria-label="Next event"');
  });
});
