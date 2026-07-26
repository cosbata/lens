import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TODAY_EVENTS } from "../../src/web/map/briefing-fixture";
import {
  filterTodayEvents,
  selectPrimaryEvent,
  TodayOverview,
} from "../../src/web/screens/TodayOverview";
import { displayUpdatedAt, MonitorPanel } from "../../src/web/components/MonitorPanel";
import { eventAppearance } from "../../src/web/map/WorldMap";

describe("today map overview", () => {
  it("renders the curated worldwide watchlist and one primary briefing", () => {
    const html = renderToStaticMarkup(<TodayOverview />);

    expect((html.match(/aria-pressed=/g) ?? [])).toHaveLength(2);
    expect(html).not.toContain('aria-label="Current event feed"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("quake-a");
    expect(html).not.toContain("quake-a-copy");
    expect(html).toContain("Loading world map");
    expect(html).toContain('aria-label="Map filters and layers"');
    expect(html).toContain('aria-label="Current world events"');
    expect(html).not.toContain('aria-label="Selected event details"');
    expect(html).toContain("Today’s main issue");
    expect(html).toContain('aria-label="Map style"');
    expect(html).toContain("Satellite");
    expect(html).toContain("Borders");
    expect(html).toContain('aria-label="Event category colours"');
    expect(html).toContain("Clusters show nearby event totals");
    expect(TODAY_EVENTS[0].media?.src).toContain("f=image");
    expect(html).not.toContain('aria-label="Previous event"');
  });

  it("filters the shared event collection by category and text", () => {
    expect(filterTodayEvents(TODAY_EVENTS, "", "Security").map(({ id }) => id))
      .toEqual(["security-b"]);
    expect(filterTodayEvents(TODAY_EVENTS, "central bank", "all").map(({ id }) => id))
      .toEqual(["economy-c"]);
    expect(filterTodayEvents(TODAY_EVENTS, "missing", "all")).toEqual([]);
  });

  it("selects the highest-scoring event as the independent primary briefing", () => {
    expect(selectPrimaryEvent([...TODAY_EVENTS].reverse())?.id).toBe("quake-a");
    expect(selectPrimaryEvent([])).toBeUndefined();
  });

  it("turns live timestamps into compact sidecar copy", () => {
    expect(displayUpdatedAt("2026-07-26T00:00:00Z")).toBe("Jul 26 · 00:00 UTC");
    expect(displayUpdatedAt("18 min ago")).toBe("18 min ago");
  });

  it("uses readable map subtypes without changing the event category", () => {
    expect(eventAppearance({ category: "Disasters", title: "Wildfire COW" }).label).toBe("Wildfire");
    expect(eventAppearance({ category: "Disasters", title: "Typhoon Noul" }).label).toBe("Storm");
    expect(eventAppearance({ category: "Economy", title: "Market shock" }).label).toBe("Economy");
  });

  it("shows provenance and score details immediately in the selected-event panel", () => {
    const event = {
      ...TODAY_EVENTS[0],
      sourceCount: 3,
      locationPrecision: "country_approximate",
      locationDisplayName: "Egypt",
      scoreVersion: "wm-lens-news-v1",
      scoreReasons: ["distinct_sources.3.60"],
    };
    const html = renderToStaticMarkup(
      <MonitorPanel events={[event]} active={event} liveState="live" onSelect={() => {}} />,
    );
    expect(html).toContain("Independent sources");
    expect(html).toContain("country approximate");
    expect(html).toContain("Egypt");
    expect(html).toContain("Why this score");
    expect(html).toContain("wm-lens-news-v1");
  });
});
