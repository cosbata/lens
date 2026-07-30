import type { EventCluster, Observation } from "../../core/model";
import {
  clusterObservations,
  decideMerge,
  type ClusterObservation,
} from "../../core/cluster/deterministic";
import type { LensStore } from "../store";

function locationKey(observation: Observation) {
  if (observation.globalScope) return "global";
  if (!observation.geometry) return "unknown";
  const coordinate = observation.geometry.type === "Point"
    ? observation.geometry.coordinates
    : observation.geometry.coordinates.flat(2) as number[];
  return `${Math.round(Number(coordinate[0]))}:${Math.round(Number(coordinate[1]))}`;
}

function clusterRecord(observation: Observation): ClusterObservation {
  return {
    id: observation.id,
    provider: observation.provider,
    providerSourceId: observation.providerSourceId,
    canonicalUrl: observation.url,
    title: `${observation.title} ${observation.description}`,
    eventType: observation.primaryCategory,
    entities: observation.affectedCountries,
    locationKey: locationKey(observation),
    locationPrecision: String(observation.measurements.locationPrecision ?? ""),
    occurredAt: observation.occurredAt,
  };
}

export function groupCanonicalObservations(observations: Observation[]) {
  const records = observations.map(clusterRecord);
  const byId = new Map(observations.map((item) => [item.id, item]));
  return clusterObservations(records).map((ids) => ({
    observations: ids.map((id) => byId.get(id)!),
    mergeReasons: ids.slice(1).map((id) =>
      decideMerge(records.find((item) => item.id === ids[0])!, records.find((item) => item.id === id)!)
        .reason
    ),
  }));
}

const eventIdForObservation = (observation: Observation) =>
  observation.provider === "rss" ? `event:${observation.id}` : observation.id;

function mergedEvent(
  store: LensStore,
  observations: Observation[],
  existingEvents: readonly EventCluster[],
): EventCluster {
  const sorted = [...observations].sort(
    (left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id),
  );
  const preferred = sorted.find(({ provider }) => provider === "usgs") ?? sorted[0];
  const evidence = sorted.flatMap((observation) =>
    store.evidenceForObservation(observation.id)
  );
  const evidenceIds = evidence.map(({ id }) => id);
  const related = existingEvents.filter((event) =>
    event.evidenceIds.some((id) => evidenceIds.includes(id)));
  const previous = related.find(({ id }) => id === eventIdForObservation(preferred))
    ?? related.sort((left, right) => left.id.localeCompare(right.id))[0];
  return {
    id: previous?.id ?? eventIdForObservation(preferred),
    title: preferred.title,
    description: preferred.description,
    primaryCategory: preferred.primaryCategory,
    eventType: preferred.eventType === "unknown"
      ? sorted.find(({ eventType }) => eventType && eventType !== "unknown")?.eventType ?? "unknown"
      : preferred.eventType,
    relatedCategories: [...new Set(sorted.flatMap(({ relatedCategories }) => relatedCategories))],
    geometry: preferred.geometry,
    geometryHistory: preferred.geometryHistory,
    globalScope: sorted.some(({ globalScope }) => globalScope),
    affectedCountries: [...new Set(sorted.flatMap(({ affectedCountries }) => affectedCountries))],
    firstSeenAt: previous?.firstSeenAt ?? sorted[0].fetchedAt,
    lastSeenAt: sorted.reduce(
      (latest, item) => item.fetchedAt > latest ? item.fetchedAt : latest,
      sorted[0].fetchedAt,
    ),
    lastMaterialUpdateAt: sorted.reduce(
      (latest, item) => item.occurredAt > latest ? item.occurredAt : latest,
      sorted[0].occurredAt,
    ),
    phase: previous?.phase ?? "active",
    measurements: preferred.measurements,
    evidenceIds,
    sourceFamilies: [...new Set(
      evidence.length > 0
        ? evidence.map(({ sourceFamily }) => sourceFamily)
        : sorted.map(({ sourceFamily }) => sourceFamily),
    )],
  };
}

export function reconcileEvents(store: LensStore) {
  const existingEvents = store.events();
  return groupCanonicalObservations(store.observations()).map(({ observations, mergeReasons }) => {
    const event = mergedEvent(store, observations, existingEvents);
    store.saveEvent(event);
    const observationIds = new Set(observations.map(eventIdForObservation));
    for (const duplicate of existingEvents) {
      if (
        duplicate.id !== event.id
        && duplicate.phase === "active"
        && observationIds.has(duplicate.id)
      ) {
        store.saveEvent({ ...duplicate, phase: "resolved", lastSeenAt: event.lastSeenAt });
        duplicate.phase = "resolved";
      }
    }
    return { event, observationIds: observations.map(({ id }) => id), mergeReasons };
  });
}
