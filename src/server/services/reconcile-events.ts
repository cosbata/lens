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
    title: observation.title,
    eventType: observation.primaryCategory,
    entities: observation.affectedCountries,
    locationKey: locationKey(observation),
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

function mergedEvent(store: LensStore, observations: Observation[]): EventCluster {
  const sorted = [...observations].sort(
    (left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.id.localeCompare(right.id),
  );
  const preferred = sorted.find(({ provider }) => provider === "usgs") ?? sorted[0];
  const evidenceIds = sorted.flatMap((observation) =>
    store.evidenceForObservation(observation.id).map(({ id }) => id)
  );
  const previous = store.events().find((event) =>
    event.evidenceIds.some((id) => evidenceIds.includes(id))
  );
  return {
    id: previous?.id ?? `event:${sorted[0].id}`,
    title: preferred.title,
    description: preferred.description,
    primaryCategory: preferred.primaryCategory,
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
    sourceFamilies: [...new Set(sorted.map(({ sourceFamily }) => sourceFamily))],
  };
}

export function reconcileEvents(store: LensStore) {
  return groupCanonicalObservations(store.observations()).map(({ observations, mergeReasons }) => {
    const event = mergedEvent(store, observations);
    store.saveEvent(event);
    return { event, observationIds: observations.map(({ id }) => id), mergeReasons };
  });
}
