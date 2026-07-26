import { describe, expect, it } from "vitest";
import { TEMPORAL_DEMO_EVENTS } from "../../src/web/map/briefing-fixture";
import {
  formatRelativeTime,
  historyAt,
  temporalMapState,
  timelineMarkers,
  timeAtStep,
  tripPlayback,
} from "../../src/web/map/temporal";

describe("temporal map data", () => {
  const event = TEMPORAL_DEMO_EVENTS[0];
  const endAt = "2026-07-25T09:41:00Z";

  it("maps the 24-hour range to exact UTC hours", () => {
    expect(timeAtStep(endAt, 0)).toBe("2026-07-24T09:41:00.000Z");
    expect(timeAtStep(endAt, 12)).toBe("2026-07-24T21:41:00.000Z");
    expect(timeAtStep(endAt, 24)).toBe("2026-07-25T09:41:00.000Z");
  });

  it("formats fractional playback time without raw decimals", () => {
    expect(formatRelativeTime(1.3835)).toBe("22h 37m ago");
    expect(formatRelativeTime(23.5)).toBe("30m ago");
    expect(formatRelativeTime(24)).toBe("Now");
  });

  it("reveals only observed positions and grows the trace", () => {
    const halfway = timeAtStep(endAt, 12);
    const state = temporalMapState(event, halfway);

    expect(historyAt(event.geometryHistory, halfway)).toHaveLength(4);
    expect(state.observationCount).toBe(4);
    expect(state.trace).toMatchObject({
      type: "LineString",
      coordinates: expect.arrayContaining([[43.3, 12.7], [55.4, -16.5]]),
    });
    expect(state.observedAt).toBe("2026-07-24T21:41:00Z");
  });

  it("does not invent a trace for a single-point event", () => {
    const state = temporalMapState(TEMPORAL_DEMO_EVENTS[1], endAt);
    expect(state.geometry.type).toBe("Point");
    expect(state.trace).toBeNull();
  });

  it("builds a dense, timestamped display trip without changing observations", () => {
    const halfway = timeAtStep(endAt, 12);
    const trip = tripPlayback(event.geometryHistory, halfway)!;
    expect(trip.path.length).toBeGreaterThan(event.geometryHistory!.length);
    expect(trip.path[0]).toEqual(event.geometryHistory![0].geometry.coordinates);
    expect(trip.path.at(-1)).toEqual(event.geometryHistory!.at(-1)!.geometry.coordinates);
    expect(trip.timestamps.at(-1)).toBe(24);
    expect(trip.currentTime).toBe(12);
  });

  it("clamps playback and its moving marker to the observed route", () => {
    const trip = tripPlayback(event.geometryHistory, "2099-01-01T00:00:00Z")!;
    expect(trip.currentTime).toBe(24);
  });

  it("derives exact selectable markers from attributable observations", () => {
    const markers = timelineMarkers(TEMPORAL_DEMO_EVENTS, endAt);
    expect(markers).toHaveLength(7);
    expect(markers[3]).toMatchObject({
      eventId: "route-red-sea",
      step: 12,
      timestamp: "2026-07-24T21:41:00Z",
    });
  });
});
