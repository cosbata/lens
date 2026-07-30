import {
  parseEvidence,
  parseObservation,
  type Evidence,
  type Observation,
} from "../../core/model";

type JsonRecord = Record<string, unknown>;

function record(value: unknown, field: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`invalid_usgs:${field}`);
  return value as JsonRecord;
}

function string(value: unknown, field: string): string {
  if (typeof value !== "string" || value === "") throw new Error(`invalid_usgs:${field}`);
  return value;
}

function number(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`invalid_usgs:${field}`);
  return value;
}

function isoTime(value: unknown, field: string): string {
  const timestamp = number(value, field);
  const result = new Date(timestamp);
  if (!Number.isFinite(result.getTime())) throw new Error(`invalid_usgs:${field}`);
  return result.toISOString();
}

export function normalizeUsgsEvent(
  featureValue: unknown,
  detailValue: unknown,
  fetchedAt: string,
): { observation: Observation; evidence: Evidence } {
  const feature = record(featureValue, "feature");
  const detail = record(detailValue, "detail");
  const id = string(feature.id, "id");
  if (detail.id !== id) throw new Error("invalid_usgs:detail.id");

  const properties = record(feature.properties, "properties");
  const detailProperties = record(detail.properties, "detail.properties");
  const geometry = record(feature.geometry, "geometry");
  const coordinates = geometry.coordinates;
  if (
    geometry.type !== "Point" ||
    !Array.isArray(coordinates) ||
    coordinates.length < 3
  ) {
    throw new Error("invalid_usgs:geometry");
  }

  const magnitude = number(properties.mag, "properties.mag");
  const title = string(properties.title, "properties.title");
  const url = string(properties.url, "properties.url");
  const occurredAt = isoTime(properties.time, "properties.time");
  const updatedAt = isoTime(detailProperties.updated, "detail.properties.updated");
  const measurements = {
    magnitude,
    significance: number(properties.sig, "properties.sig"),
    felt: properties.felt === null ? null : number(properties.felt, "properties.felt"),
    tsunami: number(properties.tsunami, "properties.tsunami") === 1,
    alert: properties.alert === null ? null : string(properties.alert, "properties.alert"),
    depthKm: number(coordinates[2], "geometry.coordinates.2"),
  };

  const observation = parseObservation({
    id: `usgs:${id}`,
    provider: "usgs",
    providerSourceId: id,
    sourceFamily: "usgs",
    url,
    occurredAt,
    fetchedAt,
    title,
    description: string(properties.place, "properties.place"),
    primaryCategory: "disasters",
    eventType: "earthquake",
    relatedCategories: [],
    geometry: { type: "Point", coordinates: [coordinates[0], coordinates[1]] },
    globalScope: false,
    affectedCountries: [],
    measurements,
    extension: {
      detailUrl: string(properties.detail, "properties.detail"),
      revisionAt: updatedAt,
    },
  });
  const evidence = parseEvidence({
    id: `usgs:${id}:evidence`,
    observationId: observation.id,
    sourceId: id,
    sourceFamily: "usgs",
    url,
    publishedAt: occurredAt,
    fetchedAt,
    title,
  });

  return { observation, evidence };
}
