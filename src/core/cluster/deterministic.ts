export interface ClusterObservation {
  id: string;
  provider: string;
  providerSourceId: string;
  canonicalUrl: string;
  title: string;
  eventType: string;
  entities: string[];
  locationKey: string;
  locationPrecision?: string;
  occurredAt: string;
}

export interface MergeDecision {
  merge: boolean;
  reason: string;
  similarity: number;
}

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

const DISEASE_TOPICS = [
  "ebola", "marburg", "mpox", "cholera", "dengue", "measles",
  "polio", "hantavirus", "covid",
] as const;
const INCIDENT_TOPICS: Array<[string, RegExp]> = [
  ["wildfire", /\b(?:wildfires?|forest fires?|bushfires?)\b/i],
  ["protest", /\b(?:protests?|demonstrations?|rallies|unrest)\b/i],
  ["earthquake", /\b(?:earthquakes?|quakes?)\b/i],
  ["flood", /\b(?:floods?|flooding)\b/i],
  ["storm", /\b(?:storms?|hurricanes?|typhoons?|cyclones?)\b/i],
  ["attack", /\b(?:attacks?|airstrikes?|strikes?|bombings?)\b/i],
  ["outage", /\b(?:outages?|blackouts?|service disruptions?)\b/i],
];

export const incidentTopic = (text: string) => {
  const normalized = text.toLowerCase();
  return DISEASE_TOPICS.find((topic) => normalized.includes(topic))
    ?? INCIDENT_TOPICS.find(([, pattern]) => pattern.test(text))?.[0];
};

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
  const hours = Math.abs(Date.parse(left.occurredAt) - Date.parse(right.occurredAt)) / 3_600_000;
  const sharedEntity = left.entities.length === 0
    || right.entities.length === 0
    || right.entities.some((entity) =>
      new Set(left.entities.map(normalize)).has(normalize(entity)));
  const leftTopic = incidentTopic(left.title);
  if (
    hours <= 96
    && left.provider === "rss"
    && right.provider === "rss"
    && left.locationKey === right.locationKey
    && sharedEntity
    && left.locationPrecision === "named_hub"
    && right.locationPrecision === "named_hub"
    && leftTopic !== undefined
    && leftTopic === incidentTopic(right.title)
  ) {
    return { merge: true, reason: "merge.named_incident", similarity: 1 };
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
  const candidateClusters = new Map<string, Set<number>>();
  const keys = (observation: ClusterObservation) => [
    `provider:${observation.provider}:${observation.providerSourceId}`,
    ...(observation.canonicalUrl ? [`url:${observation.canonicalUrl}`] : []),
    `location:${observation.eventType}:${observation.locationKey}`,
    ...(observation.provider === "rss" && observation.locationPrecision === "named_hub"
      ? [`rss-incident:${observation.locationKey}`]
      : []),
  ];
  for (const observation of [...observations].sort((a, b) => a.id.localeCompare(b.id))) {
    const candidates = [...new Set(
      keys(observation).flatMap((key) => [...(candidateClusters.get(key) ?? [])]),
    )].sort((left, right) => left - right);
    const clusterIndex = candidates.find((index) =>
      decideMerge(clusters[index][0], observation).merge);
    const index = clusterIndex ?? clusters.length;
    if (clusterIndex === undefined) clusters.push([observation]);
    else clusters[clusterIndex].push(observation);
    for (const key of keys(observation)) {
      const indexes = candidateClusters.get(key);
      if (indexes) indexes.add(index);
      else candidateClusters.set(key, new Set([index]));
    }
  }
  return clusters.map((items) => items.map(({ id }) => id));
}
import { storySimilarity } from "../../upstream/worldmonitor/story-identity.js";
