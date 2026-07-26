import { describe, expect, it, vi } from "vitest";
import {
  briefingToActivityEvents,
  briefingToPrimaryEvent,
  briefingToTodayEvents,
  watchBriefing,
  type BriefingResponse,
} from "../../src/web/data/live-briefing";
import { TODAY_EVENTS } from "../../src/web/map/briefing-fixture";

const response: BriefingResponse = {
  meta: { state: "fresh", dataTime: "2026-07-25T12:00:00Z" },
  data: {
    events: [{
      event: {
        id: "live-event",
        title: "Live official event",
        description: "A new material event.",
        primaryCategory: "disasters",
        geometry: { type: "Point", coordinates: [10, 20] },
        geometryHistory: [
          { observedAt: "2026-07-25T11:00:00Z", geometry: { type: "Point", coordinates: [9, 19] } },
          { observedAt: "2026-07-25T12:00:00Z", geometry: { type: "Point", coordinates: [10, 20] } },
        ],
        lastMaterialUpdateAt: "2026-07-25T12:00:00Z",
        sourceFamilies: ["usgs"],
        measurements: {
          locationPrecision: "named_hub",
          locationDisplayName: "Example region",
        },
      },
      scores: [{
        finalScore: 71,
        version: "wm-lens-news-v1",
        reasons: ["severity.high.75", "distinct_sources.2.40"],
      }],
      evidence: [{
        publishedAt: "2026-07-25T11:59:00Z",
        sourceFamily: "usgs",
        title: "Official record",
        url: "https://earthquake.usgs.gov/example",
      }],
    }],
  },
};

it("maps structured activity independently from the editorial watchlist", () => {
  const activity = structuredClone(response);
  activity.data.activity = activity.data.events;
  expect(briefingToActivityEvents(activity).map(({ id }) => id)).toEqual(["live-event"]);
});

describe("live briefing client", () => {
  it("turns a canonical API event into a complete navigable story", () => {
    const [event] = briefingToTodayEvents(response, TODAY_EVENTS);
    expect(event).toMatchObject({
      id: "live-event",
      score: 71,
      coordinates: [10, 20],
      geometryHistory: expect.any(Array),
      timelineSource: "live",
      sourceCount: 1,
      locationPrecision: "named_hub",
      locationDisplayName: "Example region",
      scoreVersion: "wm-lens-news-v1",
    });
    expect(event.scoreReasons).toContain("distinct_sources.2.40");
    expect(event.geometryHistory).toHaveLength(2);
    expect(event.storyChapters).toHaveLength(5);
    expect(event.evidence[0]).toMatchObject({ kind: "official" });
    expect(event.media).toBeUndefined();
  });

  it("uses an attributable source image before location imagery", () => {
    const withImage: BriefingResponse = {
      ...response,
      data: {
        events: [{
          ...response.data.events[0],
          evidence: [{
            ...response.data.events[0].evidence[0],
            imageUrl: "https://example.com/photo.jpg",
            imageAlt: "Emergency crews near the event",
            imageCredit: "Example News",
          }],
        }],
      },
    };

    expect(briefingToTodayEvents(withImage, TODAY_EVENTS)[0].media).toEqual({
      src: "https://example.com/photo.jpg",
      alt: "Emergency crews near the event",
      credit: "Example News",
      href: "https://earthquake.usgs.gov/example",
      kind: "source",
    });
  });

  it("uses the broader watchlist for the map and selected events for the primary issue", () => {
    const watchEvent = {
      ...response.data.events[0],
      event: {
        ...response.data.events[0].event,
        id: "watch-event",
        title: "Current mapped observation",
      },
    };
    const expanded: BriefingResponse = {
      ...response,
      data: { ...response.data, watchlist: [watchEvent] },
    };

    expect(briefingToTodayEvents(expanded, TODAY_EVENTS)[0].id).toBe("watch-event");
    expect(briefingToPrimaryEvent(expanded, TODAY_EVENTS[0]).id).toBe("live-event");
  });

  it("refetches on SSE and falls back to timed polling after failure", async () => {
    vi.useFakeTimers();
    const listeners = new Map<string, () => void>();
    const stream = {
      onopen: null as null | (() => void),
      onerror: null as null | (() => void),
      addEventListener: (name: string, listener: () => void) => {
        listeners.set(name, listener);
      },
      close: vi.fn(),
    };
    const fetcher = vi.fn(async () => new Response(JSON.stringify(response)));
    const states: string[] = [];
    const stop = watchBriefing({
      onBriefing: vi.fn(),
      onState: (state) => states.push(state),
      fetcher,
      eventSource: () => stream,
      pollMs: 100,
    });
    await vi.runAllTicks();
    listeners.get("briefing")?.();
    await vi.runAllTicks();
    stream.onerror?.();
    await vi.advanceTimersByTimeAsync(100);

    expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(states).toContain("polling");
    stop();
    vi.useRealTimers();
  });
});
