export interface ClusterObservation {
  id: string;
  provider: string;
  providerSourceId: string;
  canonicalUrl: string;
  title: string;
  eventType: string;
  entities: string[];
  locationKey: string;
  occurredAt: string;
}

export interface MergeDecision {
  merge: boolean;
  reason: string;
  similarity: number;
}

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

export function decideMerge(
  left: ClusterObservation,
  right: ClusterObservation,
): MergeDecision {
  if (left.provider === right.provider && left.providerSourceId === right.providerSourceId) {
    return { merge: true, reason: "merge.provider_native_id", similarity: 1 };
  }
  if (left.canonicalUrl !== "" && left.canonicalUrl === right.canonicalUrl) {
    return { merge: true, reason: "merge.canonical_url", similarity: 1 };
  }
  if (left.eventType !== right.eventType) {
    return { merge: false, reason: "separate.event_type_conflict", similarity: 0 };
  }
  if (left.locationKey !== right.locationKey) {
    return { merge: false, reason: "separate.location_conflict", similarity: 0 };
  }
  const leftEntities = new Set(left.entities.map(normalize));
  if (
    leftEntities.size > 0 &&
    right.entities.length > 0 &&
    !right.entities.some((entity) => leftEntities.has(normalize(entity)))
  ) {
    return { merge: false, reason: "separate.entity_conflict", similarity: 0 };
  }
  if (normalize(left.title) === normalize(right.title)) {
    return { merge: true, reason: "merge.normalized_title", similarity: 1 };
  }
  const hours = Math.abs(Date.parse(left.occurredAt) - Date.parse(right.occurredAt)) / 3_600_000;
  if (!Number.isFinite(hours) || hours > 24) {
    return { merge: false, reason: "separate.time_window", similarity: 0 };
  }
  const similarity = Math.round(storySimilarity(left.title, right.title) * 1000) / 1000;
  return similarity >= 0.615
    ? { merge: true, reason: "merge.title_similarity", similarity }
    : { merge: false, reason: "separate.low_similarity", similarity };
}

export function clusterObservations(observations: ClusterObservation[]): string[][] {
  const clusters: ClusterObservation[][] = [];
  for (const observation of [...observations].sort((a, b) => a.id.localeCompare(b.id))) {
    const cluster = clusters.find((items) => decideMerge(items[0], observation).merge);
    if (cluster) cluster.push(observation);
    else clusters.push([observation]);
  }
  return clusters.map((items) => items.map(({ id }) => id));
}
import { storySimilarity } from "../../upstream/worldmonitor/story-identity.js";
