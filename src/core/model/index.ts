export const CATEGORIES = [
  "conflict",
  "politics-diplomacy",
  "security",
  "disasters",
  "climate-environment",
  "economy",
  "energy",
  "supply-chains",
  "health",
  "technology-infrastructure",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type ProviderState = "success" | "degraded" | "failed";
export type EventPhase = "emerging" | "active" | "recovering" | "resolved";
export type Position = [longitude: number, latitude: number];
export type Geometry =
  | { type: "Point"; coordinates: Position }
  | { type: "LineString"; coordinates: Position[] }
  | { type: "Polygon"; coordinates: Position[][] };
export type TimedGeometry = { observedAt: string; geometry: Geometry };
export type Measurements = Record<string, string | number | boolean | null>;

export interface ProviderRun {
  id: string;
  provider: string;
  startedAt: string;
  completedAt?: string;
  state: ProviderState;
  itemCount: number;
  stale: boolean;
  errorClass?: string;
}

export interface Evidence {
  id: string;
  observationId: string;
  sourceId: string;
  sourceFamily: string;
  url: string;
  publishedAt: string;
  fetchedAt: string;
  title: string;
  imageUrl?: string;
  imageAlt?: string;
  imageCredit?: string;
}

export interface Observation {
  id: string;
  provider: string;
  providerSourceId: string;
  sourceFamily: string;
  url: string;
  occurredAt: string;
  fetchedAt: string;
  title: string;
  description: string;
  primaryCategory: Category;
  relatedCategories: Category[];
  geometry: Geometry | null;
  geometryHistory?: TimedGeometry[];
  globalScope: boolean;
  affectedCountries: string[];
  measurements: Measurements;
  extension: Record<string, unknown>;
}

export interface EventCluster {
  id: string;
  title: string;
  description: string;
  primaryCategory: Category;
  relatedCategories: Category[];
  geometry: Geometry | null;
  geometryHistory?: TimedGeometry[];
  globalScope: boolean;
  affectedCountries: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  lastMaterialUpdateAt: string;
  phase: EventPhase;
  measurements: Measurements;
  evidenceIds: string[];
  sourceFamilies: string[];
}

export interface EventScore {
  eventId: string;
  version: string;
  domainImpact: number;
  urgency: number;
  momentum: number;
  reach: number;
  anomaly: number;
  cascade: number;
  confidence: number;
  freshness: number;
  finalScore: number;
  floors: string[];
  reasons: string[];
  calculatedAt: string;
}

export interface CategoryScore {
  category: Category;
  score: number;
  qualifyingEventIds: string[];
  calculatedAt: string;
  rankingVersion: string;
}

export interface BriefingSnapshot {
  id: string;
  createdAt: string;
  eventIds: string[];
  categoryScores: CategoryScore[];
  rankingVersion: string;
  providerHealth: Array<{ provider: string; state: ProviderState; stale: boolean }>;
}

export class ModelValidationError extends Error {
  constructor(
    readonly code: "invalid_record" | "invalid_time" | "invalid_geometry" | "invalid_category" | "invalid_score",
    readonly field: string,
  ) {
    super(`${code}:${field}`);
    this.name = "ModelValidationError";
  }
}

const categorySet = new Set<string>(CATEGORIES);
const providerStates = new Set<ProviderState>(["success", "degraded", "failed"]);
const phases = new Set<EventPhase>(["emerging", "active", "recovering", "resolved"]);

function record(value: unknown, field = "record"): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ModelValidationError("invalid_record", field);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ModelValidationError("invalid_record", field);
  }
  return value;
}

function optionalText(value: unknown, field: string): string | undefined {
  return value === undefined ? undefined : text(value, field);
}

function time(value: unknown, field: string): string {
  const result = text(value, field);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(result) || !Number.isFinite(Date.parse(result))) {
    throw new ModelValidationError("invalid_time", field);
  }
  return result;
}

function optionalTime(value: unknown, field: string): string | undefined {
  return value === undefined ? undefined : time(value, field);
}

function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new ModelValidationError("invalid_record", field);
  return value;
}

function stringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new ModelValidationError("invalid_record", field);
  return value.map((item, index) => text(item, `${field}.${index}`));
}

function category(value: unknown, field: string): Category {
  if (typeof value !== "string" || !categorySet.has(value)) {
    throw new ModelValidationError("invalid_category", field);
  }
  return value as Category;
}

function categoryList(value: unknown, field: string): Category[] {
  if (!Array.isArray(value)) throw new ModelValidationError("invalid_category", field);
  return value.map((item, index) => category(item, `${field}.${index}`));
}

function score(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new ModelValidationError("invalid_score", field);
  }
  return value;
}

function position(value: unknown, field: string): Position {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    typeof value[0] !== "number" ||
    typeof value[1] !== "number" ||
    value[0] < -180 ||
    value[0] > 180 ||
    value[1] < -90 ||
    value[1] > 90
  ) {
    throw new ModelValidationError("invalid_geometry", field);
  }
  return [value[0], value[1]];
}

function geometry(value: unknown, field: string): Geometry {
  const input = record(value, field);
  if (input.type === "Point") {
    return { type: "Point", coordinates: position(input.coordinates, `${field}.coordinates`) };
  }
  if (input.type === "LineString" && Array.isArray(input.coordinates) && input.coordinates.length >= 2) {
    return {
      type: "LineString",
      coordinates: input.coordinates.map((item, index) => position(item, `${field}.coordinates.${index}`)),
    };
  }
  if (input.type === "Polygon" && Array.isArray(input.coordinates) && input.coordinates.length > 0) {
    return {
      type: "Polygon",
      coordinates: input.coordinates.map((ring, ringIndex) => {
        if (!Array.isArray(ring) || ring.length < 4) {
          throw new ModelValidationError("invalid_geometry", `${field}.coordinates.${ringIndex}`);
        }
        return ring.map((item, index) => position(item, `${field}.coordinates.${ringIndex}.${index}`));
      }),
    };
  }
  throw new ModelValidationError("invalid_geometry", field);
}

function location(input: Record<string, unknown>): Pick<Observation, "geometry" | "globalScope"> {
  const globalScope = boolean(input.globalScope, "globalScope");
  const parsedGeometry = input.geometry === null ? null : geometry(input.geometry, "geometry");
  return { geometry: parsedGeometry, globalScope };
}

function optionalGeometryHistory(value: unknown): TimedGeometry[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new ModelValidationError("invalid_geometry", "geometryHistory");
  const history = value.map((entry, index) => {
    const item = record(entry, `geometryHistory.${index}`);
    return {
      observedAt: time(item.observedAt, `geometryHistory.${index}.observedAt`),
      geometry: geometry(item.geometry, `geometryHistory.${index}.geometry`),
    };
  });
  if (history.some((entry, index) => index > 0 && entry.observedAt < history[index - 1].observedAt)) {
    throw new ModelValidationError("invalid_time", "geometryHistory");
  }
  return history;
}

function measurements(value: unknown): Measurements {
  const input = record(value, "measurements");
  for (const [key, item] of Object.entries(input)) {
    if (item !== null && !["string", "number", "boolean"].includes(typeof item)) {
      throw new ModelValidationError("invalid_record", `measurements.${key}`);
    }
  }
  return input as Measurements;
}

function providerState(value: unknown, field: string): ProviderState {
  if (typeof value !== "string" || !providerStates.has(value as ProviderState)) {
    throw new ModelValidationError("invalid_record", field);
  }
  return value as ProviderState;
}

function eventPhase(value: unknown): EventPhase {
  if (typeof value !== "string" || !phases.has(value as EventPhase)) {
    throw new ModelValidationError("invalid_record", "phase");
  }
  return value as EventPhase;
}

export function parseProviderRun(value: unknown): ProviderRun {
  const input = record(value);
  if (!Number.isInteger(input.itemCount) || (input.itemCount as number) < 0) {
    throw new ModelValidationError("invalid_record", "itemCount");
  }
  return {
    id: text(input.id, "id"),
    provider: text(input.provider, "provider"),
    startedAt: time(input.startedAt, "startedAt"),
    completedAt: optionalTime(input.completedAt, "completedAt"),
    state: providerState(input.state, "state"),
    itemCount: input.itemCount as number,
    stale: boolean(input.stale, "stale"),
    errorClass: optionalText(input.errorClass, "errorClass"),
  };
}

export function parseEvidence(value: unknown): Evidence {
  const input = record(value);
  const url = text(input.url, "url");
  const imageUrl = optionalText(input.imageUrl, "imageUrl");
  try {
    new URL(url);
    if (imageUrl) new URL(imageUrl);
  } catch {
    throw new ModelValidationError("invalid_record", imageUrl ? "imageUrl" : "url");
  }
  return {
    id: text(input.id, "id"),
    observationId: text(input.observationId, "observationId"),
    sourceId: text(input.sourceId, "sourceId"),
    sourceFamily: text(input.sourceFamily, "sourceFamily"),
    url,
    publishedAt: time(input.publishedAt, "publishedAt"),
    fetchedAt: time(input.fetchedAt, "fetchedAt"),
    title: text(input.title, "title"),
    ...(imageUrl ? { imageUrl } : {}),
    ...(input.imageAlt ? { imageAlt: text(input.imageAlt, "imageAlt") } : {}),
    ...(input.imageCredit ? { imageCredit: text(input.imageCredit, "imageCredit") } : {}),
  };
}

export function parseObservation(value: unknown): Observation {
  const input = record(value);
  const geometryHistory = optionalGeometryHistory(input.geometryHistory);
  return {
    id: text(input.id, "id"),
    provider: text(input.provider, "provider"),
    providerSourceId: text(input.providerSourceId, "providerSourceId"),
    sourceFamily: text(input.sourceFamily, "sourceFamily"),
    url: text(input.url, "url"),
    occurredAt: time(input.occurredAt, "occurredAt"),
    fetchedAt: time(input.fetchedAt, "fetchedAt"),
    title: text(input.title, "title"),
    description: text(input.description, "description"),
    primaryCategory: category(input.primaryCategory, "primaryCategory"),
    relatedCategories: categoryList(input.relatedCategories, "relatedCategories"),
    ...location(input),
    ...(geometryHistory ? { geometryHistory } : {}),
    affectedCountries: stringList(input.affectedCountries, "affectedCountries"),
    measurements: measurements(input.measurements),
    extension: record(input.extension, "extension"),
  };
}

export function parseEventCluster(value: unknown): EventCluster {
  const input = record(value);
  const geometryHistory = optionalGeometryHistory(input.geometryHistory);
  return {
    id: text(input.id, "id"),
    title: text(input.title, "title"),
    description: text(input.description, "description"),
    primaryCategory: category(input.primaryCategory, "primaryCategory"),
    relatedCategories: categoryList(input.relatedCategories, "relatedCategories"),
    ...location(input),
    ...(geometryHistory ? { geometryHistory } : {}),
    affectedCountries: stringList(input.affectedCountries, "affectedCountries"),
    firstSeenAt: time(input.firstSeenAt, "firstSeenAt"),
    lastSeenAt: time(input.lastSeenAt, "lastSeenAt"),
    lastMaterialUpdateAt: time(input.lastMaterialUpdateAt, "lastMaterialUpdateAt"),
    phase: eventPhase(input.phase),
    measurements: measurements(input.measurements),
    evidenceIds: stringList(input.evidenceIds, "evidenceIds"),
    sourceFamilies: stringList(input.sourceFamilies, "sourceFamilies"),
  };
}

export function parseEventScore(value: unknown): EventScore {
  const input = record(value);
  return {
    eventId: text(input.eventId, "eventId"),
    version: text(input.version, "version"),
    domainImpact: score(input.domainImpact, "domainImpact"),
    urgency: score(input.urgency, "urgency"),
    momentum: score(input.momentum, "momentum"),
    reach: score(input.reach, "reach"),
    anomaly: score(input.anomaly, "anomaly"),
    cascade: score(input.cascade, "cascade"),
    confidence: score(input.confidence, "confidence"),
    freshness: score(input.freshness, "freshness"),
    finalScore: score(input.finalScore, "finalScore"),
    floors: stringList(input.floors, "floors"),
    reasons: stringList(input.reasons, "reasons"),
    calculatedAt: time(input.calculatedAt, "calculatedAt"),
  };
}

export function parseCategoryScore(value: unknown): CategoryScore {
  const input = record(value);
  return {
    category: category(input.category, "category"),
    score: score(input.score, "score"),
    qualifyingEventIds: stringList(input.qualifyingEventIds, "qualifyingEventIds"),
    calculatedAt: time(input.calculatedAt, "calculatedAt"),
    rankingVersion: text(input.rankingVersion, "rankingVersion"),
  };
}

export function parseBriefingSnapshot(value: unknown): BriefingSnapshot {
  const input = record(value);
  if (!Array.isArray(input.categoryScores) || !Array.isArray(input.providerHealth)) {
    throw new ModelValidationError("invalid_record", "snapshot");
  }
  return {
    id: text(input.id, "id"),
    createdAt: time(input.createdAt, "createdAt"),
    eventIds: stringList(input.eventIds, "eventIds"),
    categoryScores: input.categoryScores.map(parseCategoryScore),
    rankingVersion: text(input.rankingVersion, "rankingVersion"),
    providerHealth: input.providerHealth.map((value, index) => {
      const item = record(value, `providerHealth.${index}`);
      return {
        provider: text(item.provider, `providerHealth.${index}.provider`),
        state: providerState(item.state, `providerHealth.${index}.state`),
        stale: boolean(item.stale, `providerHealth.${index}.stale`),
      };
    }),
  };
}
