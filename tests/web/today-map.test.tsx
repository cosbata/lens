import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Geometry, TimedGeometry } from "../../src/core/model";
import { TODAY_EVENTS, type TodayEvent } from "../../src/web/map/briefing-fixture";
import {
  filterTodayEvents,
  mapCollectionsForMode,
  selectPrimaryEvent,
  TodayOverview,
} from "../../src/web/screens/TodayOverview";
import { displayUpdatedAt, MonitorPanel } from "../../src/web/components/MonitorPanel";
import { dataFreshnessLabel } from "../../src/web/components/MonitorControls";
import { comparisonHref } from "../../src/web/map/temporal";
import {
  clusterExpansionCamera,
  countryLabelData,
  countrySurfaceData,
  eventAppearance,
  hasRenderedLayerAtPoint,
  monitoringGeometryCounts,
  monitoringGeometryData,
  spreadCoincidentPoints,
} from "../../src/web/map/WorldMap";

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
    expect(html).toContain('aria-label="Event categories"');
    expect((html.match(/type="checkbox"/g) ?? [])).toHaveLength(5);
    expect(html).toContain('aria-label="Map display mode"');
    expect(html).toContain("Important");
    expect(html).toContain("All monitored");
    expect(html).toContain("Live observations");
    expect(html).toContain("Observed routes &amp; areas");
    expect(html).toContain("Reported alerts (0)");
    expect(html).toContain('data-alerts-visible="true"');
    expect(html).toContain('aria-label="Current world events"');
    expect(html).not.toContain('aria-label="Selected event details"');
    expect(html).toContain("Today’s main issue");
    expect(html).toContain('aria-label="Map style"');
    expect(html).toContain("Satellite");
    expect(html).toContain("Borders");
    expect(html).toContain('aria-label="Event category colours"');
    expect(html).toContain("Event type");
    expect(TODAY_EVENTS[0].media?.src).toContain("f=image");
    expect(html).not.toContain('aria-label="Previous event"');
  });

  it("keeps reported alerts as an independent attributed map layer", () => {
    const alert = {
      ...TODAY_EVENTS[0],
      id: "reported-alert",
      category: "Conflict",
      eventType: "missile-drone",
      chapter: "Reported alert",
      locationPrecision: "country_approximate",
      locationDisplayName: "Example country",
      countryCodes: ["EX"],
    };
    const html = renderToStaticMarkup(<TodayOverview alertEvents={[alert]} />);

    expect(html).toContain("Reported alerts (1)");
    expect(html).toContain('data-alerts-visible="true"');
    expect(html).toContain("4 monitored events are visible");
  });

  it("shows compact operational proxies without presenting them as verified alerts", () => {
    const html = renderToStaticMarkup(<TodayOverview operationalSignals={{
      state: "fresh",
      updatedAt: "2026-07-29T12:00:00Z",
      sources: { pizzint: "fresh", gdelt: "fresh" },
      pizza: {
        level: 4,
        activity: 38,
        activeSpikes: 1,
        locationsMonitored: 7,
        locationsOpen: 6,
      },
      tensions: [{
        id: "usa_iran",
        label: "USA — IRAN",
        score: 2.4,
        trend: "rising",
        changePercent: 8,
        conflictCount: 120,
        articleCount: 400,
        sentiment: -3,
      }],
      caveat: "Public proxy and media-derived signals; not an official threat level.",
    }} />);

    expect(html).toContain('aria-label="Operational proxy signals"');
    expect(html).toContain("PizzINT activity proxy");
    expect(html).toContain("38 / 100");
    expect(html).toContain("USA — IRAN · rising");
    expect(html).toContain("not an official threat level");
  });

  it("maps only attributable routes and areas across the monitored collection", () => {
    const events: TodayEvent[] = [
      {
        ...TODAY_EVENTS[0],
        id: "tracked",
        geometryHistory: [
          { observedAt: "2026-07-28T10:00:00Z", geometry: { type: "Point", coordinates: [1, 2] } },
          { observedAt: "2026-07-28T11:00:00Z", geometry: { type: "Point", coordinates: [3, 4] } },
        ] satisfies TimedGeometry[],
      },
      {
        ...TODAY_EVENTS[1],
        id: "area",
        geometry: {
          type: "Polygon",
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
        } satisfies Geometry,
      },
      { ...TODAY_EVENTS[2], id: "point-only", geometryHistory: undefined },
    ];
    const data = monitoringGeometryData(events, "2026-07-28T12:00:00Z");

    expect(data.features.map(({ properties }) => properties.id)).toEqual(["tracked", "area"]);
    expect(data.features.map(({ geometry }) => geometry.type)).toEqual(["LineString", "Polygon"]);
    expect(monitoringGeometryCounts(events, "2026-07-28T12:00:00Z"))
      .toEqual({ routes: 1, areas: 1 });
  });

  it("keeps important, monitored, and live map collections distinct", () => {
    const important = TODAY_EVENTS.slice(0, 1);
    const monitored = TODAY_EVENTS.slice(0, 2);
    const live = TODAY_EVENTS.slice(2, 3);

    expect(mapCollectionsForMode("important", important, monitored, live)).toEqual({
      events: important,
      activityEvents: [],
    });
    expect(mapCollectionsForMode("monitored", important, monitored, live)).toEqual({
      events: important,
      activityEvents: [monitored[1]],
    });
    expect(mapCollectionsForMode("live", important, monitored, live)).toEqual({
      events: [],
      activityEvents: live,
    });
  });

  it("filters the shared event collection by category and text", () => {
    expect(filterTodayEvents(TODAY_EVENTS, "", ["Security", "Economy"]).map(({ id }) => id))
      .toEqual(["security-b", "economy-c"]);
    expect(filterTodayEvents(TODAY_EVENTS, "central bank", ["Disasters", "Security", "Economy"]).map(({ id }) => id))
      .toEqual(["economy-c"]);
    expect(filterTodayEvents(TODAY_EVENTS, "", [])).toEqual([]);
    expect(filterTodayEvents(TODAY_EVENTS, "missing", ["Disasters", "Security", "Economy"])).toEqual([]);
  });

  it("selects the highest-scoring event as the independent primary briefing", () => {
    expect(selectPrimaryEvent([...TODAY_EVENTS].reverse())?.id).toBe("quake-a");
    expect(selectPrimaryEvent([])).toBeUndefined();
  });

  it("turns live timestamps into compact sidecar copy", () => {
    expect(displayUpdatedAt("2026-07-26T00:00:00Z")).toBe("Jul 26 · 00:00 UTC");
    expect(displayUpdatedAt("18 min ago")).toBe("18 min ago");
    expect(dataFreshnessLabel("2026-07-26T00:29:30Z", Date.parse("2026-07-26T00:30:00Z")))
      .toBe("Updated just now");
    expect(dataFreshnessLabel("2026-07-26T00:20:00Z", Date.parse("2026-07-26T00:30:00Z")))
      .toBe("Updated 10 min ago");
  });

  it("uses readable map subtypes without changing the event category", () => {
    expect(eventAppearance({ category: "Disasters", eventType: "wildfire" }).label).toBe("Wildfire");
    expect(eventAppearance({ category: "Disasters", eventType: "storm" }).label).toBe("Storm");
    expect(eventAppearance({ category: "Economy", eventType: "market-shock" }).label).toBe("Economy");
  });

  it("uses MapLibre's real-coordinate expansion camera unchanged", async () => {
    const center: [number, number] = [10, 20];
    await expect(clusterExpansionCamera({
      getClusterExpansionZoom: async () => 7,
    }, 42, center)).resolves.toEqual({ center, zoom: 7 });
  });

  it("gives event circles priority over overlapping map surfaces", () => {
    const queryRenderedFeatures = (_point: unknown, options: { layers?: string[] }) =>
      options.layers?.includes("lens-event-clusters") ? [{}] : [];

    expect(hasRenderedLayerAtPoint(
      { queryRenderedFeatures } as never,
      {} as never,
      ["lens-event-clusters"],
    )).toBe(true);
    expect(hasRenderedLayerAtPoint(
      { queryRenderedFeatures } as never,
      {} as never,
      ["lens-country-event-areas"],
    )).toBe(false);
  });

  it("keeps coincident exact events visible without changing their stored coordinate", () => {
    const coordinates: [number, number] = [90, 40];
    const points = Array.from({ length: 31 }, (_, index) => ({
      id: `event-${index}`,
      coordinates,
      locationPrecision: "provider_exact",
    }));
    const spread = spreadCoincidentPoints(points);

    expect(spread).toHaveLength(31);
    expect(new Set([...spread.values()].map((point) => point.join(",")))).toHaveLength(31);
    expect(points.every((point) => point.coordinates === coordinates)).toBe(true);
  });

  it("turns country-level events into one selectable country surface", () => {
    const events = [
      {
        ...TODAY_EVENTS[0],
        id: "fr-1",
        category: "Disasters",
        locationPrecision: "country_approximate",
        countryCodes: ["FR"],
      },
      {
        ...TODAY_EVENTS[1],
        id: "fr-2",
        category: "Security",
        locationPrecision: "country_approximate",
        countryCodes: ["FR"],
      },
      {
        ...TODAY_EVENTS[2],
        id: "exact",
        locationPrecision: "provider_exact",
        countryCodes: ["FR"],
      },
    ];
    const data = countrySurfaceData({
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: {
          NAME: "France",
          ISO_A2_EH: "FR",
        },
        geometry: {
          type: "Polygon",
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]],
        },
      }],
    }, events);

    expect(data.features).toHaveLength(1);
    expect(data.features[0].properties).toMatchObject({
      countryCode: "FR",
      eventCount: 2,
      label: "France · 2",
    });
    expect(JSON.parse(String(data.features[0].properties.eventIds))).toEqual(["fr-1", "fr-2"]);
    expect(countryLabelData(events).features).toMatchObject([{
      properties: {
        eventCount: 2,
        label: expect.stringContaining("2"),
      },
      geometry: {
        type: "Point",
        coordinates: events[0].coordinates,
      },
    }]);
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
    expect(html).toContain(`href="${comparisonHref(event.id)}"`);
  });
});
