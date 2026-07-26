import type { Geometry, Position, TimedGeometry } from "../../core/model";
import type { TodayEvent } from "./briefing-fixture";

export const TIMELINE_HOURS = 24;

export type TimelineMarker = {
  id: string;
  eventId: string;
  label: string;
  step: number;
  timestamp: string;
};

export function formatRelativeTime(step: number) {
  const minutes = Math.max(0, Math.round((TIMELINE_HOURS - step) * 60));
  if (minutes === 0) return "Now";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m ago`;
  return `${hours}h${remainder ? ` ${remainder}m` : ""} ago`;
}

export type TemporalMapState = {
  geometry: Geometry;
  trace: Geometry | null;
  observedAt: string | null;
  observationCount: number;
};

export function timeAtStep(endAt: string, step: number) {
  const bounded = Math.max(0, Math.min(TIMELINE_HOURS, step));
  return new Date(
    Date.parse(endAt) - (TIMELINE_HOURS - bounded) * 3_600_000,
  ).toISOString();
}

export function timelineMarkers(
  events: readonly TodayEvent[],
  endAt: string,
): TimelineMarker[] {
  const end = Date.parse(endAt);
  const start = end - TIMELINE_HOURS * 3_600_000;
  return events.flatMap((event) => (event.geometryHistory ?? []).flatMap((entry, index) => {
    const observedAt = Date.parse(entry.observedAt);
    if (observedAt < start || observedAt > end) return [];
    return [{
      id: `${event.id}:${entry.observedAt}:${index}`,
      eventId: event.id,
      label: `${event.title} · observed ${entry.observedAt.slice(11, 16)} UTC`,
      step: (observedAt - start) / 3_600_000,
      timestamp: entry.observedAt,
    }];
  })).sort((left, right) => left.step - right.step || left.id.localeCompare(right.id));
}

export function historyAt(
  history: readonly TimedGeometry[] | undefined,
  at: string,
) {
  const time = Date.parse(at);
  return (history ?? []).filter(({ observedAt }) => Date.parse(observedAt) <= time);
}

function pointTrace(history: readonly TimedGeometry[]): Geometry | null {
  const positions = history.flatMap(({ geometry }) =>
    geometry.type === "Point" ? [geometry.coordinates] : [],
  );
  return positions.length >= 2
    ? { type: "LineString", coordinates: positions as Position[] }
    : null;
}

export function tripPlayback(
  history: readonly TimedGeometry[] | undefined,
  at: string,
  samplesPerSegment = 24,
) {
  const observations = (history ?? []).flatMap(({ observedAt, geometry }) =>
    geometry.type === "Point" ? [{ observedAt, position: geometry.coordinates }] : [],
  );
  if (observations.length < 2) return null;

  const startedAt = Date.parse(observations[0].observedAt);
  const path: Position[] = [];
  const timestamps: number[] = [];
  // ponytail: display interpolation is local; split at the antimeridian if global tracks require it.
  for (let index = 0; index < observations.length - 1; index += 1) {
    const previous = observations[index - 1]?.position ?? observations[index].position;
    const current = observations[index];
    const next = observations[index + 1];
    const following = observations[index + 2]?.position ?? next.position;
    for (let sample = 0; sample < samplesPerSegment; sample += 1) {
      const t = sample / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      path.push([0, 1].map((axis) => 0.5 * (
        2 * current.position[axis] +
        (-previous[axis] + next.position[axis]) * t +
        (2 * previous[axis] - 5 * current.position[axis] + 4 * next.position[axis] - following[axis]) * t2 +
        (-previous[axis] + 3 * current.position[axis] - 3 * next.position[axis] + following[axis]) * t3
      )) as Position);
      const sampleTime = Date.parse(current.observedAt) +
        (Date.parse(next.observedAt) - Date.parse(current.observedAt)) * t;
      timestamps.push((sampleTime - startedAt) / 3_600_000);
    }
  }
  path.push(observations.at(-1)!.position);
  timestamps.push((Date.parse(observations.at(-1)!.observedAt) - startedAt) / 3_600_000);
  const currentTime = Math.max(0, Math.min(
    timestamps.at(-1)!,
    (Date.parse(at) - startedAt) / 3_600_000,
  ));
  return {
    path,
    timestamps,
    currentTime,
  };
}

export function temporalMapState(event: TodayEvent, at: string): TemporalMapState {
  const visible = historyAt(event.geometryHistory, at);
  const latest = visible.at(-1);
  const fallback: Geometry = event.geometry ?? { type: "Point", coordinates: event.coordinates };
  const geometry = latest?.geometry ?? fallback;
  const trace = pointTrace(visible) ??
    (geometry.type === "LineString" ? geometry : null);
  return {
    geometry,
    trace,
    observedAt: latest?.observedAt ?? null,
    observationCount: visible.length,
  };
}
